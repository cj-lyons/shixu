import { dataSchema, localDay, type Data } from './model';
export type FocusRecord=Data['sessions'][number];
export function readDeferredFocus(key:string):FocusRecord[]{
 try{const values:unknown=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(values))return [];return values.flatMap(v=>{const parsed=dataSchema.shape.sessions.element.safeParse(v);return parsed.success?[parsed.data]:[];});}catch{return [];}
}
export function focusRecord(timer:{id:string;mode:string;finished:boolean;duration:number;taskId:string;title:string;finishedAt?:number;goal?:string},now:number):FocusRecord|null{
 return timer.mode==='focus'&&timer.finished?{id:timer.id,taskId:timer.taskId,title:timer.title,minutes:timer.duration/60,date:localDay(new Date(timer.finishedAt??now)),endedAt:new Date(timer.finishedAt??now).toISOString(),...(timer.goal?{goal:timer.goal}:{})}:null;
}
export function unsavedFocus(saved:FocusRecord[],deferred:FocusRecord[],current:FocusRecord|null):FocusRecord[]{
 const known=new Set(saved.map(s=>s.id)),items=new Map(deferred.map(s=>[s.id,s]));if(current)items.set(current.id,current);return [...items.values()].filter(s=>!known.has(s.id));
}
