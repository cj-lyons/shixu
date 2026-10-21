import { useRef, useState } from 'react';
import type { FocusRecord } from './focus-cycle';
type Note={progress:string;resumeFrom:string};
type NotesStore={plannedGoal:string;notes:Record<string,Note>};
function read(key:string):NotesStore{
 try{const raw=JSON.parse(localStorage.getItem(key)||'{}'),notes:Record<string,Note>={};
  if(raw.notes&&typeof raw.notes==='object')for(const [id,value]of Object.entries(raw.notes)){const v=value as Note;if(id.length<=100&&v&&typeof v.progress==='string'&&typeof v.resumeFrom==='string')notes[id]={progress:v.progress.slice(0,500),resumeFrom:v.resumeFrom.slice(0,500)};}
  return {plannedGoal:typeof raw.plannedGoal==='string'?raw.plannedGoal.slice(0,300):'',notes};
 }catch{return {plannedGoal:'',notes:{}};}
}
export function useStageNotes(scope:string,onError:(message:string)=>void){
 const key='shixu-stage-notes-v1-'+scope,[store,setStore]=useState(()=>read(key)),current=useRef(store);
 function update(next:NotesStore){try{localStorage.setItem(key,JSON.stringify(next));current.current=next;setStore(next);return true;}catch{onError('本段文字未能保存在本机，请先复制保留后重试。');return false;}}
 return {
  plannedGoal:store.plannedGoal,
  setGoal:(value:string)=>update({...current.current,plannedGoal:value}),
  value:(record:FocusRecord,field:keyof Note)=>store.notes[record.id]?.[field]??record[field]??'',
  edit:(record:FocusRecord,field:keyof Note,value:string)=>{const old=current.current;return update({...old,notes:{...old.notes,[record.id]:{...(old.notes[record.id]||{progress:record.progress||'',resumeFrom:record.resumeFrom||''}),[field]:value}}});},
  attach:(record:FocusRecord):FocusRecord=>{const note=current.current.notes[record.id];return note?{...record,progress:note.progress.trim()||undefined,resumeFrom:note.resumeFrom.trim()||undefined}:record;},
  forget:(ids:Set<string>)=>update({...current.current,notes:Object.fromEntries(Object.entries(current.current.notes).filter(([id])=>!ids.has(id)))}),
 };
}
