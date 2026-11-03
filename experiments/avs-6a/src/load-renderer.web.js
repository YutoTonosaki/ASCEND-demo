import {stage} from './diagnostics';
export function loadRenderer(){return stage('import/Scene-web',()=>require('./Scene.web').default);}
