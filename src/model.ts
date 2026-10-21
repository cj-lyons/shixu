import { z } from 'zod';
export const DATA_FORMAT_VERSION=2;
export const taskSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(300),
  category: z.enum(['inbox','batch','waiting']), due: z.string().max(40),
  owner: z.string().max(100), from: z.string().max(100), standard: z.string().max(2000),
  estimate: z.number().int().min(5).max(1440), energy: z.enum(['low','medium','high']),
  done: z.boolean(), coreDate: z.string().max(10), created: z.string().max(40),
  lastProgress:z.string().max(500).optional(),resumeFrom:z.string().max(500).optional(),
  phaseUpdatedAt:z.string().datetime().optional(),
  followUpAt:z.string().max(40).refine(value=>!value||Number.isFinite(Date.parse(value)),'跟进日期无效').optional(),interruptedSessionId:z.string().max(100).optional(),
});
export const dataSchema = z.object({
  tasks: z.array(taskSchema).max(3000),
  sessions: z.array(z.object({id:z.string().max(100), taskId:z.string().max(100), title:z.string().max(300), minutes:z.number().min(1).max(180), date:z.string().max(10),goal:z.string().max(300).optional(),progress:z.string().max(500).optional(),resumeFrom:z.string().max(500).optional(),endedAt:z.string().datetime().optional()})).max(10000),
  energy: z.record(z.enum(['low','medium','high'])),
  prefs: z.object({focus:z.number().int().min(1).max(120),short:z.number().int().min(1).max(60),long:z.number().int().min(1).max(90),batchTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}),
});
export type Task = z.infer<typeof taskSchema>;
export type Data = z.infer<typeof dataSchema>;
export const emptyData = ():Data => ({tasks:[],sessions:[],energy:{},prefs:{focus:25,short:5,long:15,batchTime:'16:30'}});
export function localDay(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
