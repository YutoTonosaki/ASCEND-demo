const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGrowthDebugReader}=require('../src/growth/debug.ts');
const {PlayerRepository,PLAYER_KEY}=require('../src/storage/player-repository.ts');
const {initializePlayer,reconcilePlayer}=require('../src/growth/domain.ts');
const {standardExercises}=require('../src/data/exercises.ts');
const {newWorkout,newEntry}=require('../src/training/plans.ts');
const {startSession,confirmSet,position}=require('../src/sessions/domain.ts');
const at=n=>new Date(Date.UTC(2026,8,23,12,0,n)).toISOString();
function fixture(){
 const plan={...newWorkout(),name:'Debug',exercises:['push-up','squat'].map(id=>{const e=newEntry(standardExercises.find(x=>x.id===id));return {...e,restSeconds:0,sets:e.sets.slice(0,2)};})};
 let s=startSession(plan,standardExercises,at(1));
 for(const [i,reps] of [10,12,10,12].entries())s=confirmSet(s,position(s).set.id,{type:'reps',reps},at(i+2));
 const sessions={version:1,active:null,completed:[s]};
 const p=initializePlayer('debug-player',at(0),null,{version:1,active:null,completed:[]});
 return {data:{version:1,player:reconcilePlayer(p,sessions,at(10))},sessions};
}
function storage(raw){let value=raw;let writes=0;return {read:async()=>value,write:async(k,v)=>{assert.equal(k,PLAYER_KEY);writes++;value=v;},remove:async()=>{throw Error('must not remove');},replace:v=>{value=v;},raw:()=>value,writes:()=>writes};}
test('debug reads existing fractional ratings and every event kind without writes or recalculation',async()=>{
 const {data}=fixture(),raw=JSON.stringify(data),adapter=storage(raw),read=createGrowthDebugReader(adapter);
 const a=await read(),b=await read();assert.deepEqual(a,data);assert.deepEqual(b,data);assert.equal(adapter.raw(),raw);assert.equal(adapter.writes(),0);
 assert.ok(a.player.ratings.Chest%1>0);assert.deepEqual([...new Set(a.player.events.map(e=>e.kind))].sort(),['assessment','bonus','growth']);
});
test('debug results are detached and rereads see newly saved state without changing precision',async()=>{
 const {data}=fixture(),adapter=storage(JSON.stringify(data)),read=createGrowthDebugReader(adapter);
 const first=await read();first.player.ratings.Chest=0;first.player.events.length=0;
 assert.deepEqual(await read(),data);
 adapter.replace(JSON.stringify({version:1,player:null}));assert.deepEqual(await read(),{version:1,player:null});assert.equal(adapter.writes(),0);
});
test('missing, damaged and unsupported player data are never initialized, repaired or reset',async()=>{
 const adapter=storage(null),read=createGrowthDebugReader(adapter);assert.deepEqual(await read(),{version:1,player:null});assert.equal(adapter.raw(),null);
 for(const raw of ['broken',JSON.stringify({version:2,player:null})]){adapter.replace(raw);await assert.rejects(read());assert.equal(adapter.raw(),raw);}
 const {data}=fixture();adapter.replace(JSON.stringify(data));assert.deepEqual(await read(),data);assert.equal(adapter.writes(),0);
});
test('debug read failure cannot invalidate the live PlayerRepository or append growth events',async()=>{
 const {data,sessions}=fixture(),adapter=storage(JSON.stringify(data));const writer=new PlayerRepository(adapter,()=>at(20));await writer.load();
 const reader=createGrowthDebugReader(adapter);adapter.replace('broken');await assert.rejects(reader());adapter.replace(JSON.stringify(data));
 assert.deepEqual(await writer.reconcile(sessions),data);assert.equal(adapter.writes(),0);assert.deepEqual(await reader(),data);
});
