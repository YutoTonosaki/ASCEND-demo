// Isolated synthetic reward ledgers. No real device/user records are changed.
const {seed}=require('./shop-ux-fixture.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/shop/catalog.ts'),D=require('../src/shop/domain.ts'),R=require('../src/rewards/domain.ts');
const folder=path.join(__dirname,'../docs/images/phase5b');fs.mkdirSync(folder,{recursive:true});
function funded(locale){const data=seed(locale);let rewards=R.emptyRewards();for(let i=0;i<180;i++){const localDay=new Date(Date.UTC(2026,0,1+i,12)).toISOString().slice(0,10);rewards=R.applyReward(rewards,{sessionId:`expansion-${i}`,playerId:'shop-ux',completedAt:`${localDay}T12:00:00.000Z`,localDay,weekId:R.weekId(localDay),offsetMinutes:0})}data['ascend.rewards.v1']=JSON.stringify(rewards);return data}
(async()=>{const browser=await chromium.launch();try{
for(const [locale,width]of [['en',390],['ja',320]]){
const ja=locale==='ja',l=require(`../src/localization/locales/${locale}.ts`)[locale];
const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(data=>{if(!localStorage.getItem('qa-expansion')){for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);localStorage.setItem('qa-expansion','1')}window.expWrites=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('ascend.'))window.expWrites.push(k);return set.call(this,k,v)}},funded(locale));
const button=name=>page.getByRole('button',{name,exact:true}),tab=name=>page.getByRole('tab',{name,exact:true}).tap();
const tr=(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll(`{${k}}`,v),l[key]);
const raw=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('ascend.'))));
const grid=()=>page.locator('[data-testid^="shop-grid-"]');
async function find(locator){for(let n=0;n<25;n++){if(await locator.count()){await locator.scrollIntoViewIfNeeded();return locator}await grid().evaluate(el=>{el.scrollTop+=el.clientHeight*.8});await page.waitForTimeout(80)}throw Error('Virtualized item not reachable')}
async function filter(value){await page.getByRole('button',{name:new RegExp(ja?'^所持状況：':'^Ownership:')}).tap();const label=tr(`shop.filter.${value}`);const selected=tr('shop.filterSelected',{filter:label});await page.getByRole('button',{name:new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$| — selected|（選択中）)`)}).first().tap()}
await page.goto(process.env.ASCEND_QA_URL);await page.getByTestId('coin-balance').filter({hasText:/Coins|コイン/}).first().waitFor();await tab(tr('nav.shop'));await page.getByTestId('shop-grid-2').waitFor();const before=await raw();
await filter('owned');await page.getByText(tr('shop.emptyFiltered'),{exact:true}).waitFor();await button(tr('shop.category.background')).tap();await page.getByText(tr('shop.emptyFiltered'),{exact:true}).waitFor();await filter('unowned');await page.getByTestId('shop-tile-bg-training-ground').waitFor();assert.equal(await page.getByTestId('shop-tile-border-steel').count(),0);assert.deepEqual(await raw(),before);assert.deepEqual(await page.evaluate(()=>window.expWrites),[]);
const first=C.cosmeticById('bg-training-ground'),firstName=tr(`shop.item.${first.id}.name`);
await (await find(button(tr('shop.buyItem',{name:firstName})))).tap();await page.getByTestId('shop-purchase-confirmation').waitFor();await button(tr('common.cancel')).tap();assert.deepEqual(await raw(),before);
await (await find(button(tr('shop.buyItem',{name:firstName})))).tap();await button(tr('common.confirm')).tap();await page.getByRole('button',{name:tr('shop.filter',{filter:tr('shop.filter.unowned')}),exact:true}).waitFor();await page.waitForFunction(id=>!document.querySelector(`[data-testid="shop-tile-${id}"]`),'bg-training-ground');
await filter('owned');await page.getByTestId('shop-tile-bg-training-ground').waitFor();await button(tr('shop.equipItem',{name:firstName})).tap();await button(tr('shop.unequipItem',{name:firstName})).waitFor();await button(tr('shop.unequipItem',{name:firstName})).tap();await button(tr('shop.equipItem',{name:firstName})).waitFor();
await filter('all');await button(tr('shop.category.all')).tap();
for(const item of C.catalog.slice(10)){
 const name=tr(`shop.item.${item.id}.name`);await grid().evaluate(el=>{el.scrollTop=0});const view=await find(button(tr('shop.details',{name})));await view.tap();const modal=page.locator('[aria-modal=true]');
 const art=modal.getByTestId(`cosmetic-art-${item.id}`);if(item.category!=='title')await art.waitFor();
 const prior=await raw();await button(tr('shop.showCard')).tap();const preview=modal.getByTestId('player-card');await preview.waitFor();if(item.category!=='title')await preview.getByTestId(`cosmetic-art-${item.id}`).waitFor();else await preview.getByTestId('cosmetic-title').getByText(name,{exact:true}).waitFor();assert.deepEqual(await raw(),prior);
 const footer=page.getByTestId('shop-item-actions');const b=await footer.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=844,'Fixed actions remain on screen');
 if(!D.parseShop((await raw())['ascend.shop.v1']??null).purchases.some(p=>p.itemId===item.id)){await button(tr('shop.buy')).tap();await button(tr('common.confirm')).tap();await button(tr('shop.equip')).waitFor()}
 await button(tr('shop.equip')).tap();await button(tr('shop.unequip')).waitFor();await button(tr('common.close')).tap();
 await tab(tr('nav.player'));const card=page.getByTestId('player-card');if(item.category!=='title')await card.getByTestId(`cosmetic-art-${item.id}`).waitFor();else await card.getByTestId('cosmetic-title').getByText(name,{exact:true}).waitFor();
 if(!ja && ['bg-cyber-grid','border-champion','aura-crimson','title-legend'].includes(item.id)){await card.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(folder,`player-${item.id}.png`)});}
 await tab(tr('nav.shop'));
}
const all=await raw(),saved=D.parseShop(all['ascend.shop.v1']);assert.equal(saved.purchases.length,10);assert.equal(new Set(saved.purchases.map(p=>p.id)).size,10);for(const[k,v]of Object.entries(before))assert.equal(all[k],v);
await filter('owned');await button(tr('shop.category.background')).tap();await page.getByTestId('shop-tile-bg-cyber-grid').waitFor();assert.equal(await page.getByTestId('shop-tile-bg-midnight').count(),0);await page.screenshot({path:path.join(folder,`owned-${locale}-${width}.png`)});
if(ja){await page.evaluate(()=>{const nodes=[...document.querySelectorAll('*')].filter(el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));const sizes=nodes.map(el=>[el,parseFloat(getComputedStyle(el).fontSize),parseFloat(getComputedStyle(el).lineHeight)]);for(const[el,size,line]of sizes){el.style.fontSize=`${size*1.5}px`;if(Number.isFinite(line))el.style.lineHeight=`${line*1.5}px`}});await page.getByTestId('shop-grid-1').waitFor();await page.screenshot({path:path.join(folder,'owned-ja-large.png')});}
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.goto(process.env.ASCEND_QA_URL);await page.getByTestId('coin-balance').filter({hasText:/Coins|コイン/}).first().waitFor();await tab(tr('nav.shop'));await page.getByTestId('shop-grid-2').waitFor();assert.deepEqual(await raw(),all);const balance=R.balance(R.parseRewards(all['ascend.rewards.v1']))-saved.purchases.reduce((n,p)=>n+p.price,0);for(const node of await page.getByTestId('coin-balance').all())assert.ok((await node.innerText()).includes(String(balance).replace(/\B(?=(\d{3})+(?!\d))/g,',')));
assert.deepEqual(errors,[]);console.log(`expansion ${locale} passed: ten new products preview/equip, filtering, cancel, no-write browsing, exact wallet, restart, no overflow/page errors`);await context.close();
}
// Same 70-Coin initial fixture as the recorded 5A.2 before screenshot.
const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'UTC',reducedMotion:'reduce'}),page=await context.newPage();await page.addInitScript(d=>{for(const[k,v]of Object.entries(d))localStorage.setItem(k,v)},seed());await page.goto(process.env.ASCEND_QA_URL);await page.getByRole('tab',{name:'SHOP',exact:true}).click();await page.getByTestId('shop-tile-bg-midnight').waitFor();await page.screenshot({path:path.join(folder,'after-en-390.png')});await context.close();
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
