import { randomUUID } from 'node:crypto';
import { dataSchema, emptyData, taskSchema } from '../src/model.ts';

const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 return value;
}
export const equal=same;
export function flatten(data){
 const records={};
 for(const t of data.tasks){records['task:'+t.id]={...t,coreDate:''};if(t.coreDate)records['core:'+t.coreDate]=t.id;}
 for(const s of data.sessions)records['session:'+s.id]=s;
 for(const [day,e]of Object.entries(data.energy))records['energy:'+day]=e;
 for(const [key,value]of Object.entries(data.prefs))records['pref:'+key]=value;
 return records;
}
function dominates(a,b){return Object.entries(b).every(([k,v])=>(a[k]||0)>=v)&&Object.entries(a).some(([k,v])=>v>(b[k]||0));}
export function mergeRecords(left,right){
 const result={...left};
 for(const [key,versions]of Object.entries(right)){
  const all=[...(result[key]||[])];
  for(const version of versions){const duplicate=all.find(v=>same(v.clock,version.clock));if(duplicate){if(!same(duplicate.value,version.value))throw Error('同步设备标识重复或云端记录异常，请保留数据并联系维护者。');}else all.push(version);}
  const live=all.filter(v=>!all.some(other=>dominates(other.clock,v.clock))),combined=[];
  for(const version of live){const sameValue=combined.find(v=>same(v.value,version.value));if(sameValue){for(const [id,n]of Object.entries(version.clock))sameValue.clock[id]=Math.max(sameValue.clock[id]||0,n);}else combined.push({clock:{...version.clock},value:version.value});}
  result[key]=combined.filter(v=>!combined.some(other=>dominates(other.clock,v.clock)));
 }
 return result;
}
export function localChanges(state,before,after){
 const previous=flatten(before),next=flatten(after),records={...state.records};let counter=state.counter;
 for(const key of new Set([...Object.keys(previous),...Object.keys(next)])){
  if(same(previous[key]??null,next[key]??null))continue;
  const clock={};for(const v of records[key]||[])for(const [device,n]of Object.entries(v.clock))clock[device]=Math.max(clock[device]||0,n);
  counter=Math.max(counter,clock[state.device]||0)+1;clock[state.device]=counter;
  records[key]=[{clock,value:next[key]??null}];
 }
 return {...state,counter,records};
}
export function newState(data){return localChanges({device:randomUUID(),counter:0,records:{},lastAt:null,uploaded:null,error:''},{...emptyData(),prefs:{}},data);}
export function conflicts(records){return Object.entries(records).filter(([,v])=>v.length>1).map(([key,versions])=>({key,versions}));}
export function materialize(records,current){
 const values={},old=flatten(current);
 for(const [key,versions]of Object.entries(records)){
  // Keep this device's visible choice until the user resolves concurrent versions.
  const chosen=versions.length===1?versions[0].value:versions.some(v=>same(v.value,old[key]??null))?(old[key]??null):null;
  if(chosen!==null)values[key]=chosen;
 }
 const tasks=Object.entries(values).filter(([k])=>k.startsWith('task:')).map(([,v])=>({...v,coreDate:''}));
 for(const [key,id]of Object.entries(values))if(key.startsWith('core:')){const task=tasks.find(t=>t.id===id);if(task)task.coreDate=key.slice(5);}
 const sessions=Object.entries(values).filter(([k])=>k.startsWith('session:')).map(([,v])=>v),energy={};
 const prefs={...emptyData().prefs};for(const [key,value]of Object.entries(values)){if(key.startsWith('energy:'))energy[key.slice(7)]=value;else if(key.startsWith('pref:'))prefs[key.slice(5)]=value;}
 return dataSchema.parse({tasks,sessions,energy,prefs});
}
export function validateSnapshot(input){
 if(!input||![1,2].includes(input.format)||!/^[-a-f0-9]{36}$/.test(input.device)||!input.records||typeof input.records!=='object'||Array.isArray(input.records)||Object.keys(input.records).length>30000)throw Error('云端同步文件格式不兼容。');
 for(const [key,versions]of Object.entries(input.records)){
  if(!/^(task|session|energy|core|pref):.{1,100}$/.test(key)||!Array.isArray(versions)||!versions.length||versions.length>30)throw Error('云端记录格式无效。');
  for(const version of versions){
   if(!version||!version.clock||typeof version.clock!=='object'||Array.isArray(version.clock)||!Object.keys(version.clock).length||Object.keys(version.clock).length>100||!Object.entries(version.clock).every(([id,n])=>/^[-a-f0-9]{36}$/.test(id)&&Number.isSafeInteger(n)&&n>0))throw Error('云端记录版本无效。');
   const value=version.value,suffix=key.slice(key.indexOf(':')+1);if(value===null)continue;
   if(key.startsWith('task:')){const t=taskSchema.parse(value);if(t.id!==suffix||t.coreDate!=='')throw Error('云端任务标识无效。');}
   else if(key.startsWith('session:')){const s=dataSchema.shape.sessions.element.parse(value);if(s.id!==suffix)throw Error('云端专注记录标识无效。');}
   else if(key.startsWith('energy:')){if(!/^\d{4}-\d{2}-\d{2}$/.test(suffix)||!['low','medium','high'].includes(value))throw Error('云端精力记录无效。');}
   else if(key.startsWith('core:')){if(!/^\d{4}-\d{2}-\d{2}$/.test(suffix)||typeof value!=='string'||value.length>100)throw Error('云端核心任务无效。');}
   else if(key.startsWith('pref:')){const schema=dataSchema.shape.prefs.shape[suffix];if(!schema)throw Error('云端设置不兼容。');schema.parse(value);}
  }
 }
 return input;
}
