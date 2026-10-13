const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/matches/calendar.ts');
const D = require('../src/matches/domain.ts');
const R = require('../src/matches/rival.ts');
const E = require('../src/matches/evidence.ts');
const {MatchRepository,MATCHES_KEY} = require('../src/storage/match-repository.ts');
const {initializePlayer,reconcilePlayer,overall} = require('../src/growth/domain.ts');
const {beginCareer} = require('../src/career/domain.ts');
const {defaultProfile} = require('../src/coach/profile.ts');
const {standardExercises} = require('../src/data/exercises.ts');
const {newWorkout,newEntry} = require('../src/training/plans.ts');
const {startSession,confirmSet,position} = require('../src/sessions/domain.ts');
const history = (...completed) => ({version:1,active:null,completed});
const at = '2026-10-06T12:00:00.000Z', end = '2026-10-12T00:00:00.000Z';
function owner() { return {player:initializePlayer('p','2026-10-01T00:00:00.000Z',null,history()),career:beginCareer('p','tokyo-zenith','2026-10-01T00:00:00.000Z').career}; }
function generated(o=owner(),profile=null,time=at,tz='UTC') { return D.generateCurrentMatch({version:1,matches:[]},o,profile,time,tz,()=>0.5); }
function workout(time,reps=10,count=1) {
  const e=newEntry(standardExercises.find(e=>e.id==='push-up'));
  let s=startSession({...newWorkout(),name:'Match test',exercises:[{...e,restSeconds:0,sets:e.sets.slice(0,count)}]},standardExercises,time);
  if(count===1) s=confirmSet(s,position(s).set.id,{type:'reps',reps},time);
  return s;
}
function memory(raw) {
  const map=new Map(raw===undefined?[]:[[MATCHES_KEY,raw]]); let writes=0;
  const f={map,fail:false,readFail:false,ackFail:false,get writes(){return writes;}};
  f.adapter={read:async k=>{if(f.readFail)throw Error('read');return map.get(k)??null;},write:async(k,v)=>{if(f.fail)throw Error('write');map.set(k,v);writes++;if(f.ackFail)throw Error('ack');},remove:async()=>{throw Error('remove forbidden');}};
  return f;
}
test('local Monday exclusive endpoints, DST spring/fall and non-hour offsets',()=>{
  for(const [time,tz,hours] of [['2026-03-04T12:00:00.000Z','America/Vancouver',167],['2026-10-28T12:00:00.000Z','America/Vancouver',169],['2026-10-06T12:00:00.000Z','Asia/Kathmandu',168]]) {
    const w=C.matchWeek(time,tz); assert.equal((Date.parse(w.endExclusiveAt)-Date.parse(w.startAt))/3600000,hours); assert.ok(C.validWeek(w));
    assert.equal(C.matchWeek(new Date(Date.parse(w.endExclusiveAt)-1).toISOString(),tz).weekId,w.weekId);
    assert.notEqual(C.matchWeek(w.endExclusiveAt,tz).weekId,w.weekId);
  }
  assert.equal(C.matchWeek('2027-01-01T12:00:00.000Z','UTC').weekId,'2026-12-28');
  assert.equal(C.matchWeek('2028-02-29T12:00:00.000Z','UTC').weekId,'2028-02-28');
  assert.throws(()=>C.matchWeek(at,'fake/zone'));
});
test('goals null and 1–7, detached immutable generation and club snapshot',()=>{
  for(const goal of [null,1,2,3,4,5,6,7]) {
    const p=defaultProfile(at);p.preferredTrainingDaysPerWeek=goal;
    const o=owner(),d=generated(o,p); assert.equal(d.matches[0].goalSnapshot,goal??3);
    p.preferredTrainingDaysPerWeek=7; o.player.ratings.Core=99;
    assert.deepEqual(D.parseMatches(JSON.stringify(d)),d);
    assert.notEqual(d.matches[0].baselineRatings.Core,99);
  }
});
test('exact adaptive weights and last five completed only, including fewer than five',()=>{
  for(const [wins,weights] of [[0,[25,50,25]],[2,[25,50,25]],[3,[20,50,30]],[4,[20,50,30]],[5,[15,45,40]]]) assert.deepEqual(R.difficultyWeights(wins),weights);
  const h=Array.from({length:7},(_,i)=>({id:String(i),resolvedAt:`2026-10-${String(i+1).padStart(2,'0')}T00:00:00.000Z`,outcome:i===6?'SKIPPED':'WIN'}));
  assert.deepEqual(R.generationEvidence(h).completedMatchIds,['5','4','3','2','1']);
  assert.deepEqual(R.generationEvidence(h.slice(0,3)).weights,[20,50,30]);
});
test('condition weighted intervals and difficulty range endpoints/clamping',()=>{
  const weights=[10,15,20,20,15,10,10];let start=0;
  for(let i=0;i<weights.length;i++){assert.equal(R.draw(weights,()=>start/100),i);assert.equal(R.draw(weights,()=>(start+weights[i]-0.00001)/100),i);start+=weights[i];}
  for(const [category,min,max] of [[0,-6,-3],[1,-2,2],[2,3,6]])for(const r of [0,0.999999]) {
    let n=0;const rival=R.generateRival('m',category===0?0:99,[category===0?1:0,category===1?1:0,category===2?1:0],'tokyo-zenith',()=>n++===1?r:0);
    assert.equal(rival.difference,r===0?min:max);assert.ok(rival.ovr>=0&&rival.ovr<=99);
  }
  for(const r of [1,-1,NaN])assert.throws(()=>R.draw([1],()=>r));
});
test('first eligible generation concurrent/reload/remount never rerolls; unrelated keys untouched',async()=>{
  const f=memory(),o=owner();for(const k of ['player','career','coach','rewards','sessions','seasons','presentation','training'])f.map.set(`ascend.${k}.v1`,k);
  const before=[...f.map];let calls=0;const r=new MatchRepository(f.adapter,()=>{calls++;return 0.5;});
  const args=[o,null,history(),at,'UTC']; const [a,b]=await Promise.all([r.refresh(...args),new MatchRepository(f.adapter,()=>{throw Error('reroll');}).refresh(...args)]);
  assert.deepEqual(a,b);assert.equal(f.writes,1);assert.equal(calls,6);
  await r.refresh(o,defaultProfile(at),history(),at,'Asia/Tokyo');assert.equal(f.writes,1);
  assert.deepEqual([...f.map].filter(([k])=>k!==MATCHES_KEY),before);
});
test('unvisited weeks not generated; fixed timezone survives travel and missing weeks',async()=>{
  const f=memory(),r=new MatchRepository(f.adapter,()=>0.5),o=owner();
  await r.refresh(o,null,history(),at,'UTC');
  const x=await r.refresh(o,null,history(),'2026-11-04T12:00:00.000Z','Asia/Tokyo');
  assert.deepEqual(x.data.matches.map(m=>m.week.weekId),['2026-10-05','2026-11-02']);
  assert.equal(x.data.matches[0].week.timeZone,'UTC');assert.equal(x.data.matches[0].weekEnd,null);assert.equal(D.matchStatus(x.data.matches[0],'2026-11-04T12:00:00.000Z'),'SKIPPED');assert.ok(x.data.matches[0].skippedAt);
});
test('historical OVR excludes next week events and stays immutable',async()=>{
  const o=owner(),w1=workout('2026-10-11T23:59:59.999Z',10),w2=workout(end,30);
  const week=generated(o).matches[0].week;
  const p1=reconcilePlayer(o.player,history(w1),end),p2=reconcilePlayer(p1,history(w1,w2),end);
  const result=E.reconstructWeekEnd(p2,history(w1,w2),week,3,end);
  assert.equal(result.status,'ready');assert.deepEqual(result.snapshot.ratings,p1.ratings);assert.equal(result.snapshot.ovr,overall(p1.ratings));assert.equal(result.snapshot.weeklyBonus,3);
  const f=memory(JSON.stringify(generated(o))),r=new MatchRepository(f.adapter,()=>0.5);
  const saved=await r.refresh({...o,player:p2},null,history(w1,w2),end,'UTC');
  const old=structuredClone(saved.data.matches[0]);
  const later=workout('2026-10-13T12:00:00.000Z',50);const p3=reconcilePlayer(p2,history(w1,w2,later),later.completedAt);
  const updated=await r.refresh({...o,player:p3},null,history(w1,w2,later),later.completedAt,'UTC');assert.deepEqual(updated.data.matches[0],old);
});
test('distinct completed positive days before generation; zero, active and cross-week sessions',()=>{
  const o=owner(),a=workout('2026-10-05T12:00:00.000Z'),b=workout('2026-10-05T13:00:00.000Z'),z=workout('2026-10-06T12:00:00.000Z',0);
  let crossing=workout('2026-10-11T12:00:00.000Z',10,2);
  crossing=confirmSet(crossing,position(crossing).set.id,{type:'reps',reps:10},'2026-10-11T23:59:59.999Z');
  const active=structuredClone(crossing);
  crossing=confirmSet(crossing,position(crossing).set.id,{type:'reps',reps:10},end);
  const data={...history(a,b,z,crossing),active:null};
  const p=reconcilePlayer(o.player,data,end),week=generated(o).matches[0].week;
  const result=E.reconstructWeekEnd(p,data,week,1,end);assert.deepEqual(result.snapshot.trainingDays,['2026-10-05']);assert.equal(result.snapshot.weeklyBonus,10);
  const ad={...history(a,b,z),active};const ap=reconcilePlayer(o.player,ad,end);
  assert.deepEqual(E.reconstructWeekEnd(ap,ad,week,7,end).snapshot.trainingDays,['2026-10-05']);
});
test('Growth delay, failed finalization, missing source, bad chain and initialization after boundary stay pending',()=>{
  const o=owner(),s=workout('2026-10-07T12:00:00.000Z'),week=generated(o).matches[0].week;
  assert.equal(E.reconstructWeekEnd(o.player,history(s),week,3,end).reason,'growth-processing-incomplete');
  const p=reconcilePlayer(o.player,history(s),end);
  const noFinal=structuredClone(p);noFinal.finalizedSessionIds=[];
  assert.equal(E.reconstructWeekEnd(noFinal,history(s),week,3,end).status,'pending');
  assert.equal(E.reconstructWeekEnd(p,history(),week,3,end).reason,'missing-session-history');
  const bad=structuredClone(p);bad.events[0].changes[0].before=99;
  assert.equal(E.reconstructWeekEnd(bad,history(s),week,3,end).status,'pending');
  const late=initializePlayer('p',end,null,history());assert.equal(E.reconstructWeekEnd(late,history(),week,3,end).reason,'player-initialized-after-boundary');
  assert.equal(E.reconstructWeekEnd(p,history(s),week,3,at).reason,'training-week-open');
});
test('time order contradiction is not sorted away',()=>{
  const o=owner(),a=workout('2026-10-07T12:00:00.000Z',10),b=workout('2026-10-08T12:00:00.000Z',20);
  const p=reconcilePlayer(o.player,history(a,b),end);p.events[p.events.length-1].at='2026-10-06T12:00:00.000Z';
  assert.equal(E.reconstructWeekEnd(p,history(a,b),generated(o).matches[0].week,3,end).status,'pending');
});
test('snapshot pending retried when Growth persisted, including write failure',async()=>{
  const o=owner(),f=memory(JSON.stringify(generated(o))),r=new MatchRepository(f.adapter,()=>0.5),s=workout('2026-10-07T12:00:00.000Z');
  const x=await r.refresh(o,null,history(s),end,'UTC');assert.equal(x.data.matches[0].weekEnd,null);assert.equal(Object.values(x.pending)[0],'growth-processing-incomplete');
  const p=reconcilePlayer(o.player,history(s),end);f.fail=true;
  await assert.rejects(r.refresh({...o,player:p},null,history(s),end,'UTC'));assert.equal((await r.load()).matches[0].weekEnd,null);
  f.fail=false;assert.ok((await r.refresh({...o,player:p},null,history(s),end,'UTC')).data.matches[0].weekEnd);
});
for(const raw of ['bad','{"version":2,"matches":[]}','{"version":1,"matches":[{}]}'])test('corrupt/unsupported never overwritten '+raw,async()=>{
  const f=memory(raw),r=new MatchRepository(f.adapter);await assert.rejects(r.load());await assert.rejects(r.refresh(owner(),null,history(),at,'UTC'));assert.equal(f.map.get(MATCHES_KEY),raw);assert.equal(f.writes,0);
});
test('invalid records, ownership, read/write failure and lost acknowledgment',async()=>{
  const f=memory(),r=new MatchRepository(f.adapter,()=>0.5),o=owner();f.readFail=true;await assert.rejects(r.refresh(o,null,history(),at,'UTC'));assert.equal(f.writes,0);
  f.readFail=false;f.fail=true;await assert.rejects(r.refresh(o,null,history(),at,'UTC'));assert.equal(f.map.size,0);
  f.fail=false;f.ackFail=true;await assert.rejects(r.refresh(o,null,history(),at,'UTC'));const stored=f.map.get(MATCHES_KEY);f.ackFail=false;
  await new MatchRepository(f.adapter,()=>{throw Error('reroll');}).refresh(o,null,history(),at,'UTC');assert.equal(f.map.get(MATCHES_KEY),stored);
  const other=owner();other.player.id='other';await assert.rejects(r.refresh(other,null,history(),at,'UTC'));assert.equal(f.map.get(MATCHES_KEY),stored);
});
for(const [name,mutate] of [
  ['goal',m=>m.goalSnapshot=8],['boundary',m=>m.week.endExclusiveAt=at],['condition',m=>m.rival.condition=11],['difference',m=>m.rival.difference=20],['baseline',m=>m.baselineOVR=99],['result',m=>m.result={outcome:'WIN'}],['duplicate',()=>{}]
])test('schema rejects '+name,()=>{const d=generated();mutate(d.matches[0]);if(name==='duplicate')d.matches.push(structuredClone(d.matches[0]));assert.throws(()=>D.parseMatches(JSON.stringify(d)));});
test('all goals calculate exact bonus including 4–7 days without display caps',()=>{
  const o=owner(),sessions=history(...Array.from({length:7},(_,i)=>workout(`2026-10-${String(i+5).padStart(2,'0')}T12:00:00.000Z`)));
  const p=reconcilePlayer(o.player,sessions,end),week=generated(o).matches[0].week;
  for(let goal=1;goal<=7;goal++) {const s=E.reconstructWeekEnd(p,sessions,week,goal,end).snapshot;assert.equal(s.trainingDays.length,7);assert.equal(s.weeklyBonus,10);}
});
test('training day attribution uses fixed Match timezone after device timezone changes',()=>{
  const o=owner(),s=workout('2026-10-06T01:00:00.000Z'),data=history(s),p=reconcilePlayer(o.player,data,end);
  const w=C.matchWeek(at,'America/Vancouver'),now='2026-10-12T07:00:00.000Z';
  assert.deepEqual(E.reconstructWeekEnd(p,data,w,3,now).snapshot.trainingDays,['2026-10-05']);
});
test('unloaded/malformed prerequisites cannot generate, and empty load never writes',async()=>{
  const f=memory(),r=new MatchRepository(f.adapter,()=>0.5),o=owner();assert.deepEqual(await r.load(),{version:1,matches:[]});
  await assert.rejects(r.refresh(o,null,{version:1,active:null,completed:[{}]},at,'UTC'));
  await assert.rejects(r.refresh(o,{},history(),at,'UTC'));
  const bad=structuredClone(o);bad.career.clubHistory[0].leftAt=at;
  await assert.rejects(r.refresh(bad,null,history(),at,'UTC'));assert.equal(f.writes,0);
});
test('snapshot corruption and fabricated completed history rejected',()=>{
  const o=owner(),d=generated(o),m=d.matches[0];m.weekEnd=E.reconstructWeekEnd(o.player,history(),m.week,3,end).snapshot;
  for(const mutate of [s=>s.ovr=99,s=>s.weeklyBonus=11,s=>s.evidence.finalizedSessionIds=['missing'],s=>s.capturedAt=at]) {
    const x=structuredClone(d);mutate(x.matches[0].weekEnd);
    if(x.matches[0].weekEnd.evidence.finalizedSessionIds.length) x.matches[0].weekEnd.evidence.qualifyingSessionIds=['other'];
    assert.throws(()=>D.parseMatches(JSON.stringify(x)));
  }
  const x=generated();x.matches[0].generationEvidence.completedMatchIds=['fabricated'];assert.throws(()=>D.parseMatches(JSON.stringify(x)));
});
test('invalid snapshot calendar/goal cannot create evidence; value comparison ignores object key order',()=>{
  const o=owner(),s=workout('2026-10-07T12:00:00.000Z'),p=reconcilePlayer(o.player,history(s),end),w=generated(o).matches[0].week;
  assert.equal(E.reconstructWeekEnd(p,history(s),w,0,end).status,'pending');
  assert.equal(E.reconstructWeekEnd(p,history(s),{...w,endExclusiveAt:at},3,end).status,'pending');
  for(const e of p.events) if(e.actual?.type==='reps') e.actual={reps:e.actual.reps,type:'reps'};
  assert.equal(E.reconstructWeekEnd(p,history(s),w,3,end).status,'ready');
});
