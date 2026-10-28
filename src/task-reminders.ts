import type { Task } from './model.ts';
import { localDay } from './model.ts';

export function isFutureTask(task:Task,day:string){
  return !!task.remindAt&&localDay(new Date(task.remindAt))>day&&task.coreDate!==day&&!(task.due&&localDay(new Date(task.due))<=day);
}
export function taskInSection(task:Task,section:string,day:string){
  if(section==='done')return task.done;
  if(task.done)return false;
  const future=isFutureTask(task,day);
  if(section==='reminders')return future;
  if(future)return false;
  if(section==='today')return task.coreDate===day||!!task.due&&localDay(new Date(task.due))<=day||!!task.remindAt&&localDay(new Date(task.remindAt))<=day;
  return task.category===section;
}
export function beforeDeadline(due:string,minutes:number){
  const time=Date.parse(due);
  return Number.isFinite(time)?new Date(time-minutes*60_000).toISOString():'';
}

export function reminderInput(value='') {
  if(!value)return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export function nextMonday(now=new Date()) {
  const date=new Date(now);
  date.setDate(date.getDate()+((8-date.getDay())%7||7));
  date.setHours(9,0,0,0);
  return date.toISOString();
}
export function reminderKey(task:Task){return `planned:${task.id}:${task.remindAt}`;}
export function reminderBody(tasks:Task[]){
  const names=tasks.slice(0,3).map(t=>`「${t.title.slice(0,50)}」`).join('、');
  return `${tasks.length===1?'该处理这件事了：':`有 ${tasks.length} 件待办需要关注：`}${names}${tasks.length>3?'等':''}。有空时打开拾序查看。`;
}
