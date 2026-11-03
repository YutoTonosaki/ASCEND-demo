// Lab-only bounded memory. No storage/network writes.
const events = [];
export function mark(stage, detail = "") {
  events.push({stage,detail:String(detail)});
  if(events.length>120)events.shift();
  console.log(`[AVS-DIAG] ${stage} ${detail}`);
}
export function recordError(stage,error){mark(`${stage}:ERROR`,error instanceof Error?`${error.message}\n${error.stack||''}`:String(error));}
export function stage(name,action){mark(`${name}:before`);try{const value=action();mark(`${name}:ok`);return value;}catch(error){recordError(name,error);throw error;}}
export function snapshot(){return JSON.stringify({events},null,2);}
