// Optional external Playwright: development server and a production web export.
require('./register.cjs');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {initializePlayer,reconcilePlayer}=require('../src/growth/domain.ts');
const {standardExercises}=require('../src/data/exercises.ts');
const {newWorkout,newEntry}=require('../src/training/plans.ts');
const {startSession,confirmSet,position}=require('../src/sessions/domain.ts');
const base=Date.now()-3600000;
const at=n=>new Date(base+n*1000).toISOString();
function fixture(){
 const plan={...newWorkout(),name:'Debug evidence',exercises:['push-up','squat'].map(id=>{const e=newEntry(standardExercises.find(x=>x.id===id));return {...e,restSeconds:0,sets:e.sets.slice(0,2)};})};
 let s=startSession(plan,standardExercises,at(1));
 for(const [i,reps] of [10,12,10,12].entries())s=confirmSet(s,position(s).set.id,{type:'reps',reps},at(i+2));
 const sessions={version:1,active:null,completed:[s]},initial=initializePlayer('debug-player',at(0),null,{version:1,active:null,completed:[]});
 return {sessions,player:{version:1,player:reconcilePlayer(initial,sessions,at(10))}};
}
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:320,height:844}}),errors=[];
  page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  const dev=process.env.ASCEND_QA_URL||'http://127.0.0.1:8107';
  const prod=process.env.ASCEND_QA_PROD_URL||'http://127.0.0.1:8108';
  const button=name=>page.getByRole('button',{name,exact:true});
  const open=async()=>{await page.getByRole('tab',{name:'PLAYER',exact:true}).click();await button('GROWTH DEBUG').click();};
  await page.goto(dev,{timeout:180000});await open();await page.getByText(/No initialized Player is saved/).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('ascend.player.v1')),null);await button('CLOSE').click();
  const f=fixture();
  await page.evaluate(({sessions,player})=>{localStorage.setItem('ascend.sessions.v1',JSON.stringify(sessions));localStorage.setItem('ascend.player.v1',JSON.stringify(player));},f);
  await page.goto(dev);await page.getByRole('tab',{name:'PLAYER',exact:true}).click();await page.getByTestId('player-card').waitFor();
  const before=await page.evaluate(()=>({...localStorage}));
  await page.evaluate(()=>{window.debugWrites=0;window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){window.debugWrites++;return window.originalSetItem.call(this,k,v);};});
  await button('GROWTH DEBUG').click();await page.getByText('CURRENT RATINGS',{exact:true}).waitFor();
  await page.getByText(`${f.player.player.ratings.Chest.toFixed(3)} · ASSESSED`,{exact:true}).waitFor();
  for(const heading of ['GROWTH EVENTS','BONUS EVENTS','ASSESSMENT EVENTS'])await page.getByText(heading,{exact:true}).waitFor();
  const growth=f.player.player.events.find(e=>e.kind==='growth').changes[0];
  assert.ok((await page.locator('body').innerText()).includes(`Actual Δ: +${growth.after-growth.before}`));
  assert.ok((await page.locator('body').innerText()).includes('— (session bonus)'));
  await page.getByText('CURRENT RATINGS',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ascend-debug-ratings-320.png'});
  await page.getByText('GROWTH EVENTS',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ascend-debug-events-320.png'});
  await button('REFRESH SAVED DATA').click();await page.getByText('CURRENT RATINGS',{exact:true}).waitFor();
  await button('CLOSE').click();await open();await page.getByText('CURRENT RATINGS',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),before);assert.equal(await page.evaluate(()=>window.debugWrites),0);
  // Changed saved snapshot must be read on reopen, not just copied from Provider memory.
  await button('CLOSE').click();
  await page.evaluate(()=>window.originalSetItem.call(localStorage,'ascend.player.v1',JSON.stringify({version:1,player:null})));
  await open();await page.getByText(/No initialized Player is saved/).waitFor();await button('CLOSE').click();
  await page.evaluate(()=>window.originalSetItem.call(localStorage,'ascend.player.v1','damaged debug data'));
  await open();await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('ascend.player.v1')),'damaged debug data');
  await page.evaluate(raw=>window.originalSetItem.call(localStorage,'ascend.player.v1',raw),before['ascend.player.v1']);
  await button('REFRESH SAVED DATA').click();await page.getByText('CURRENT RATINGS',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.debugWrites),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await button('CLOSE').click();await page.setViewportSize({width:390,height:844});await open();await page.getByText('CURRENT RATINGS',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  await page.goto(prod);await page.getByRole('tab',{name:'PLAYER',exact:true}).click();assert.equal(await button('GROWTH DEBUG').count(),0);
  assert.equal(await page.getByText('CURRENT RATINGS',{exact:true}).count(),0);
  console.log('PASS: dev-only entry, 3-decimal ratings/status/OVR, growth/bonus/assessment before-after-delta, repeated open/refresh with zero writes and unchanged storage, fresh saved reads, missing/corrupt/retry, 320/390px, production hidden, no page errors.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
