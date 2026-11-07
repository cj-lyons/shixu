import { z } from 'zod';
export const DATA_FORMAT_VERSION=4;
export const projectStepSchema=z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(300),owner:z.string().max(100),followUpAt:z.union([z.literal(''),z.string().datetime()]),done:z.boolean(),completedAt:z.string().datetime().optional()});
export const projectSchema=z.object({enabled:z.boolean(),steps:z.array(projectStepSchema).max(60),history:z.array(z.object({id:z.string().min(1).max(100),at:z.string().datetime(),kind:z.enum(['added','adjusted','completed']),stepId:z.string().min(1).max(100),title:z.string().max(300),owner:z.string().max(100),followUpAt:z.union([z.literal(''),z.string().datetime()]),previousTitle:z.string().max(300).optional(),note:z.string().max(500).optional()})).max(300)}).superRefine((project,ctx)=>{
 const ids=new Set<string>();let pending=false;
 for(const step of project.steps){if(ids.has(step.id))ctx.addIssue({code:'custom',message:'项目步骤编号重复'});ids.add(step.id);if(!step.done)pending=true;if(step.done&&pending)ctx.addIssue({code:'custom',message:'请按顺序完成项目步骤'});if(step.done!==!!step.completedAt)ctx.addIssue({code:'custom',message:'步骤完成时间与状态不一致'});}
 if(new Set(project.history.map(h=>h.id)).size!==project.history.length)ctx.addIssue({code:'custom',message:'项目记录编号重复'});
});
export const taskSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(300),
  category: z.enum(['inbox','batch','waiting']), due: z.string().max(40),
  owner: z.string().max(100), from: z.string().max(100), standard: z.string().max(2000),
  estimate: z.number().int().min(5).max(1440), energy: z.enum(['low','medium','high']),
  done: z.boolean(), coreDate: z.string().max(10), created: z.string().max(40),
  completedAt:z.string().datetime().optional(),
  lastProgress:z.string().max(500).optional(),resumeFrom:z.string().max(500).optional(),
  phaseUpdatedAt:z.string().datetime().optional(),
  remindAt:z.union([z.literal(''),z.string().datetime()]).optional(),
  followUpAt:z.string().max(40).refine(value=>!value||Number.isFinite(Date.parse(value)),'跟进日期无效').optional(),interruptedSessionId:z.string().max(100).optional(),
  project:projectSchema.optional(),
}).superRefine((task,ctx)=>{if(task.done&&task.project?.enabled&&task.project.steps.some(s=>!s.done))ctx.addIssue({code:'custom',message:'请先完成项目步骤，再完成整个项目'});});
export const dataSchema = z.object({
  tasks: z.array(taskSchema).max(3000),
  sessions: z.array(z.object({id:z.string().max(100), taskId:z.string().max(100), title:z.string().max(300), minutes:z.number().min(1).max(180), date:z.string().max(10),goal:z.string().max(300).optional(),progress:z.string().max(500).optional(),resumeFrom:z.string().max(500).optional(),endedAt:z.string().datetime().optional()})).max(10000),
  energy: z.record(z.string(),z.enum(['low','medium','high'])),
  prefs: z.object({focus:z.number().int().min(1).max(120),short:z.number().int().min(1).max(60),long:z.number().int().min(1).max(90),batchTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}),
});
export type Task = z.infer<typeof taskSchema>;
export type Data = z.infer<typeof dataSchema>;
export const emptyData = ():Data => ({tasks:[],sessions:[],energy:{},prefs:{focus:25,short:5,long:15,batchTime:'16:30'}});
export function localDay(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
