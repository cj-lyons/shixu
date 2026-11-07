import type {Task} from './model.ts';
import {canFinishTask} from './project-steps.ts';
export function completeTask(task:Task,at=new Date().toISOString()):Task{
 if(task.done)return task;
 if(!canFinishTask(task))throw Error('请先完成项目步骤，再完成整个项目');
 return {...task,done:true,completedAt:at};
}
export function reopenTaskRecord(task:Task):Task{
 const {completedAt:_,...rest}=task;return {...rest,done:false};
}
const time=(value?:string)=>{const at=Date.parse(value||'');return Number.isFinite(at)?at:0;};
export function compareCompletedTasks(a:Task,b:Task){
 // Historical tasks have no completion date. Keep genuine timestamps ahead of that group.
 return Number(!!b.completedAt)-Number(!!a.completedAt)||time(b.completedAt)-time(a.completedAt)||time(b.created)-time(a.created)||a.id.localeCompare(b.id);
}
