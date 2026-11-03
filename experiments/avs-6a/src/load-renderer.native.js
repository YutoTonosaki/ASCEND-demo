import {mark,stage} from './diagnostics';
export function loadRenderer(){
 mark("api/process",`emitWarning=${typeof process.emitWarning}`);
 const three=stage('import/three',()=>require('three'));
 mark('api/three',`extractUrlBase=${typeof three.LoaderUtils?.extractUrlBase}`);
 const gl=stage('import/expo-gl',()=>require('expo-gl'));
 mark('api/expo-gl',`GLView=${typeof gl.GLView}`);
 stage('import/expo-asset',()=>require('expo-asset'));
 stage('import/filesystem-legacy',()=>require('expo-file-system/legacy'));
 const fiber=stage('import/fiber-native',()=>require('@react-three/fiber/native'));
 mark('api/fiber',`Canvas=${typeof fiber.Canvas};useThree=${typeof fiber.useThree}`);
 return stage('import/Scene-native',()=>require('./Scene.native').default);
}
