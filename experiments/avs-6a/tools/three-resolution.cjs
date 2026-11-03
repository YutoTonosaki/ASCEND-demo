const path=require('node:path');
// Three 0.186.1's Node-only CJS wrapper calls process.emitWarning on import.
// Metro can transpile its ESM build for both ESM and CJS consumers.
const threeEsm=path.join(path.dirname(require.resolve('three')),'three.module.js');
function resolveRequest(context,moduleName,platform){
 if(moduleName==='three'){
  if(process.env.AVS_DIAGNOSTICS==='1')console.log(`[AVS-RESOLVE] ${platform} three => ${threeEsm}`);
  return {type:'sourceFile',filePath:threeEsm};
 }
 return context.resolveRequest(context,moduleName,platform);
}
module.exports={resolveRequest,threeEsm};
