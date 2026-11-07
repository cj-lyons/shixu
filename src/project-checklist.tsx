import {useState,type FormEvent} from 'react';
import {Check,ChevronRight,Plus} from 'lucide-react';
import {type Task} from './model';
import {currentProjectStep,updateProject,type ProjectStep} from './project-steps';
import {reminderInput} from './task-reminders';
import DateTimeField from './date-time-field';
import './project-checklist.css';
type Editor={kind:'added'|'adjusted';id:string;title:string;owner:string;followUpAt:string;note:string;base:string};
export default function ProjectChecklist({task,busy,onUpdate}:{task:Task;busy:boolean;onUpdate:(update:(latest:Task)=>Task)=>Promise<boolean>}){
 const [editor,setEditor]=useState<Editor|null>(null),[error,setError]=useState('');
 const project=task.project,current=currentProjectStep(task);
 if(!project?.enabled)return null;
 const stale=!!editor&&editor.base!==JSON.stringify(project);
 function open(kind:Editor['kind'],step?:ProjectStep){setEditor({kind,id:step?.id||'',title:step?.title||'',owner:step?.owner||'',followUpAt:reminderInput(step?.followUpAt),note:'',base:JSON.stringify(project)});setError('');}
 async function complete(){if(!current||busy)return;const id=current.id;setError('');if(!await onUpdate(latest=>updateProject(latest,{kind:'completed',id})))setError('这一步未确认保存，请核对最新步骤后重试。');}
 async function save(event:FormEvent){event.preventDefault();if(!editor||busy||stale)return;const e=editor;const input={title:e.title,owner:e.owner,followUpAt:e.followUpAt?new Date(e.followUpAt).toISOString():'',note:e.note};setError('');const saved=await onUpdate(latest=>{if(JSON.stringify(latest.project)!==e.base)throw Error('项目步骤已有新的修改，请核对后重新编辑');return updateProject(latest,e.kind==='added'?{kind:'added',input}:{kind:'adjusted',id:e.id,input});});if(saved)setEditor(null);else setError('本次未确认保存，填写的内容仍保留。');}
 const date=(value:string)=>new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
 return <details className="project-checklist"><summary><ChevronRight size={13}/><span>项目跟进</span><small>{current?'当前：'+current.title:project.steps.length?'步骤已完成':'先添加一步'}</small></summary><div className="project-content">
  {project.steps.length>0&&<ol className="project-steps" aria-label="项目步骤">{project.steps.map(step=><li key={step.id} className={step.done?'is-done':current?.id===step.id?'is-current':''}><span className="project-step-marker" aria-hidden="true">{step.done?<Check size={12}/>:current?.id===step.id?'●':'○'}</span><span><b>{step.title}</b>{(step.owner||step.followUpAt)&&<small>{step.owner?'负责人：'+step.owner:'负责人待明确'}{step.followUpAt?' · 跟进：'+date(step.followUpAt):''}</small>}</span>{current?.id===step.id&&<em>当前</em>}</li>)}</ol>}
  {!project.steps.length&&<p className="project-hint">先记下一步要做什么，后面可以随时补。</p>}
  {!task.done&&!current&&project.steps.length>0&&<p className="project-hint">步骤已完成，项目仍保留。可以添加下一步，或勾选任务前的圆圈完成整个项目。</p>}
  {task.done&&<p className="project-hint">项目已完成。重新打开任务后，可以继续添加下一步。</p>}
  {!editor&&<div className="project-actions"><button type="button" disabled={busy||task.done||!current} onClick={()=>void complete()}>完成这一步</button><button type="button" disabled={busy||task.done||!current} onClick={()=>open('adjusted',current)}>需要调整</button><button type="button" disabled={busy||task.done||project.steps.length>=60} onClick={()=>open('added')}><Plus size={12}/>下一步</button></div>}
  {editor&&<form className="project-editor" onSubmit={event=>void save(event)} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.requestSubmit();}}}>
   {editor.kind==='adjusted'&&<label>调整哪一步<select aria-label="调整哪一步" disabled={busy} value={editor.id} onChange={event=>{const step=project.steps.find(s=>s.id===event.target.value);if(step)open('adjusted',step);}}>{project.steps.filter(s=>!s.done).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
   <label>{editor.kind==='added'?'下一步做什么':'步骤内容'}<input aria-label={editor.kind==='added'?'下一步做什么':'步骤内容'} autoFocus required maxLength={300} disabled={busy} value={editor.title} onChange={event=>setEditor({...editor,title:event.target.value})} placeholder="例如：等袁部确认方向"/></label>
   <div className="project-editor-meta"><label>这一步的负责人（选填）<input aria-label="这一步的负责人（选填）" maxLength={100} disabled={busy} value={editor.owner} onChange={event=>setEditor({...editor,owner:event.target.value})} placeholder="我 / 袁部 / 待明确"/></label><fieldset className="project-date-control" disabled={busy}><DateTimeField label="这一步的跟进时间（选填）" value={editor.followUpAt} onChange={value=>setEditor({...editor,followUpAt:value})}/></fieldset></div>
   {editor.kind==='adjusted'&&<label>补一句备注（选填）<textarea aria-label="项目调整备注（选填）" rows={2} maxLength={500} disabled={busy} value={editor.note} onChange={event=>setEditor({...editor,note:event.target.value})} placeholder="例如：先确认培训方向，再选择老师"/></label>}
   <small className="project-hint">只提醒当前步骤；留空就不提醒，后续步骤不会提前催办。</small>
   {stale&&<p role="alert" className="project-error">步骤已在另一处更新，输入仍保留。请核对后取消并重新编辑。</p>}
   <div className="project-form-actions"><button type="button" disabled={busy} onClick={()=>{setEditor(null);setError('');}}>取消</button><button type="submit" disabled={busy||stale}>{busy?'正在保存…':'保存这一步'}</button></div>
  </form>}
  {error&&<p className="project-error" role="alert">{error}</p>}
  {project.history.length>0&&<details className="project-history"><summary>查看推进记录 · {project.history.length}</summary>{project.history.slice().reverse().map(entry=><div key={entry.id}><time>{date(entry.at)}</time><p>{entry.kind==='added'?'添加：':entry.kind==='completed'?'完成：':'调整：'}{entry.previousTitle&&entry.previousTitle!==entry.title?entry.previousTitle+' → ':''}{entry.title}</p>{(entry.owner||entry.followUpAt)&&<small>负责人：{entry.owner||'待明确'}{entry.followUpAt?' · 跟进：'+date(entry.followUpAt):''}</small>}{entry.note&&<p>{entry.note}</p>}</div>)}</details>}
 </div></details>;
}
