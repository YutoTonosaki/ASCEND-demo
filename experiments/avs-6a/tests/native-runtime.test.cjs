const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('installed Three CJS startup reproduces missing emitWarning before re-export',()=>{
 const source=fs.readFileSync(require.resolve('three'),'utf8');let required=false;
 assert.throws(()=>vm.runInNewContext(source,{process:{env:{}},module:{exports:{}},require(){required=true;}},{filename:'three/build/three.cjs'}),/emitWarning.*not a function/);
 assert.equal(required,false);
});
test('resolver maps every root Three request to the same ESM entry and delegates others',()=>{
 const{resolveRequest,threeEsm}=require('../tools/three-resolution.cjs');let delegated=0;
 const context={resolveRequest:(_,name,platform)=>{delegated++;return {name,platform}}};
 for(const platform of ['ios','android','web'])assert.equal(resolveRequest(context,'three',platform).filePath,threeEsm);
 assert.equal(delegated,0);assert.ok(fs.existsSync(threeEsm));assert.ok(threeEsm.endsWith('three.module.js'));
 assert.deepEqual(resolveRequest(context,'expo-gl','ios'),{name:'expo-gl',platform:'ios'});
});
test('shell defers platform renderer imports until explicit open',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../App.jsx'),'utf8');
 assert.doesNotMatch(app,/import Scene from/);assert.match(app,/const component\s*=\s*loadRenderer\(/);
 const native=fs.readFileSync(path.join(__dirname,'../src/load-renderer.native.js'),'utf8');
 assert.ok(native.indexOf('export function loadRenderer')<native.indexOf('require('));
});
test('diagnostic stages keep original exception and bound memory',()=>{
 const ts=require('typescript'),source=fs.readFileSync(path.join(__dirname,'../src/diagnostics.js'),'utf8');
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,console:{log(){}}});
 const d=module.exports,error=Error('probe');assert.throws(()=>d.stage('probe',()=>{throw error}),e=>e===error);
 assert.match(d.snapshot(),/probe:ERROR/);for(let i=0;i<200;i++)d.mark('entry');assert.equal(JSON.parse(d.snapshot()).events.length,120);
});

test('native module failure is attributed before any Canvas/asset load',()=>{
 const ts=require('typescript'),dSource=fs.readFileSync(path.join(__dirname,'../src/diagnostics.js'),'utf8');
 function compile(source,requireFn){const module={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:requireFn,console:{log(){}},process:{}});return module.exports;}
 const d=compile(dSource,()=>{}),called=[];
 const loader=compile(fs.readFileSync(path.join(__dirname,'../src/load-renderer.native.js'),'utf8'),name=>{
  if(name==='./diagnostics')return d;called.push(name);throw new TypeError('process.emitWarning is not a function');
 });
 assert.throws(()=>loader.loadRenderer(),/emitWarning/);assert.deepEqual(called,['three']);assert.match(d.snapshot(),/import\/three:ERROR/);
});
