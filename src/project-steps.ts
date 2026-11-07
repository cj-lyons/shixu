import {taskSchema,projectSchema,type Task} from './model.ts';
export type Project=NonNullable<Task['project']>;
export type ProjectStep=Project['steps'][number];
export type StepInput={title:string;owner:string;followUpAt:string;note?:string};
export const currentProjectStep=(task:Task)=>task.project?.enabled?task.project.steps.find(step=>!step.done):undefined;
export const canFinishTask=(task:Task)=>!currentProjectStep(task);
export function updateProject(task:Task,action:{kind:'added';input:StepInput}|{kind:'adjusted';id:string;input:StepInput}|{kind:'completed';id:string},now=new Date().toISOString()):Task{
 if(!task.project?.enabled||task.done)throw Error('请先开启项目跟进，或重新打开项目');
 if('input'in action&&!action.input.title.trim())throw Error('请填写这一步要做什么');
 const project=structuredClone(task.project);
 if(project.history.length>=300)throw Error('项目记录已达300条，请保留记录并另建后续项目');
 let step:ProjectStep,previousTitle:string|undefined;
 if(action.kind==='added'){
  if(project.steps.length>=60)throw Error('项目最多支持60步，请另建后续项目');
  step={id:crypto.randomUUID(),title:action.input.title.trim(),owner:action.input.owner.trim(),followUpAt:action.input.followUpAt,done:false};project.steps.push(step);
 }else{
  const found=project.steps.find(s=>s.id===action.id);if(!found)throw Error('这一步已变化，请重新查看');step=found;
  if(step.done)throw Error('这一步已经完成，历史记录会继续保留');
  if(action.kind==='completed'){
   if(currentProjectStep(task)?.id!==step.id)throw Error('当前步骤已经变化，请核对后再完成');step.done=true;step.completedAt=now;
  }else{previousTitle=step.title;step.title=action.input.title.trim();step.owner=action.input.owner.trim();step.followUpAt=action.input.followUpAt;}
 }
 project.history.push({id:crypto.randomUUID(),at:now,kind:action.kind,stepId:step.id,title:step.title,owner:step.owner,followUpAt:step.followUpAt,...(previousTitle?{previousTitle}:{}),...('input'in action&&action.input.note?.trim()?{note:action.input.note.trim()}: {})});
 return taskSchema.parse({...task,project});
}
export function describeProject(value:unknown):string{
 const result=projectSchema.safeParse(value);if(!result.success)return '项目内容无法读取，请保留两个版本';
 const project=result.data,current=project.steps.find(s=>!s.done);
 return [project.enabled?'已开启':'已收起',...project.steps.map(s=>(s.done?'✓ ':s.id===current?.id?'当前：':'待办：')+s.title+(s.owner?' · '+s.owner:'')+(s.followUpAt?' · 跟进 '+new Date(s.followUpAt).toLocaleString('zh-CN'):'')+ (s.completedAt?' · 完成 '+new Date(s.completedAt).toLocaleString('zh-CN'):'')),...project.history.slice(-5).map(h=>'记录：'+h.title+(h.note?' · '+h.note:''))].join('\n');
}
