import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { nextMonday, reminderInput, taskInSection, beforeDeadline } from '../src/task-reminders.ts';
import { taskSchema } from '../src/model.ts';
const {createReminders}=createRequire(import.meta.url)('../desktop/reminders.cjs');
mkdirSync('output',{recursive:true});
const dir=mkdtempSync(path.resolve('output/reminder-'));
let clock=new Date(2026,9,25,10).getTime();
const monday=nextMonday(new Date(clock));
assert.equal(reminderInput(monday),'2026-10-26T09:00');
assert.equal(reminderInput(nextMonday(new Date(2026,9,26,10))),'2026-11-02T09:00');
const task=(id,remindAt=monday)=>({id,title:'待办 '+id,category:'inbox',due:'',owner:'',from:'',standard:'',estimate:25,energy:'medium',done:false,coreDate:'',created:new Date(clock).toISOString(),remindAt});
assert.equal(taskSchema.safeParse(task('bad','not-a-date')).success,false);
// The reminder hour must not hide a task on the morning of its intended day.
const future=task('future');
assert.equal(taskInSection(future,'inbox','2026-10-25'),false);
assert.equal(taskInSection(future,'reminders','2026-10-25'),true);
assert.equal(taskInSection(future,'reminders','2026-10-26'),false);
assert.equal(taskInSection(future,'inbox','2026-10-26'),true);
assert.equal(taskInSection(future,'today','2026-10-26'),true);
assert.equal(taskInSection(future,'today','2026-10-27'),true);
assert.equal(taskInSection({...future,done:true},'today','2026-10-26'),false);
assert.equal(taskInSection({...future,remindAt:''},'inbox','2026-10-25'),true);
const waiting={...future,category:'waiting'};
assert.equal(taskInSection(waiting,'waiting','2026-10-26'),true);
assert.equal(taskInSection(waiting,'inbox','2026-10-26'),false);
assert.equal(taskInSection({...future,due:'2026-10-25T08:00'},'today','2026-10-25'),true);
assert.equal(Date.parse('2026-10-27T17:00')-Date.parse(beforeDeadline('2026-10-27T17:00',60)),3600000);
let workspace={tasks:[task('a'),task('b'),task('c')],prefs:{batchTime:'23:59'}};
const notifications=[],file=path.join(dir,'reminders.json');
const create=()=>createReminders({file,getWorkspace:()=>workspace,notify:msg=>notifications.push(msg),onTimer:()=>{},now:()=>clock});
let scheduler=create();
try{
  scheduler.tick();assert.equal(notifications.length,0);
  clock=Date.parse(monday);scheduler.tick();
  assert.equal(notifications.length,1);assert.match(notifications[0].body,/3 件/);
  for(const id of ['a','b','c'])assert.ok(notifications[0].body.includes('待办 '+id));
  scheduler.tick();assert.equal(notifications.length,1);
  scheduler.close();scheduler=create();scheduler.tick();assert.equal(notifications.length,1);
  // Rescheduling the same task creates exactly one new occurrence.
  workspace.tasks[0].remindAt=new Date(clock+60000).toISOString();
  clock+=60000;scheduler.tick();assert.equal(notifications.length,2);
  // Completion, cancellation and deletion prevent their pending alerts.
  workspace.tasks=[{...task('done'),done:true},task('cancel','')];scheduler.tick();assert.equal(notifications.length,2);
  workspace.tasks=[task('disabled')];scheduler.enable(false);scheduler.tick();assert.equal(notifications.length,2);
  scheduler.enable(true);scheduler.tick();assert.equal(notifications.length,3);
  // No scheduler is running across the due time: startup catches up once.
  scheduler.close();workspace.tasks=[task('offline',new Date(clock+60000).toISOString())];clock+=120000;
  scheduler=create();scheduler.tick();assert.equal(notifications.length,4);scheduler.tick();assert.equal(notifications.length,4);
  // A pre-deadline alert and the deadline itself have independent keys and times.
  const dueTime=clock+7200000;
  workspace.tasks=[{...task('early',new Date(clock+3600000).toISOString()),due:new Date(dueTime).toISOString()}];
  scheduler.tick();assert.equal(notifications.length,4);
  clock+=3600000;scheduler.tick();assert.equal(notifications.length,5);assert.equal(notifications[4].title,'拾序 · 待办提醒');
  clock=dueTime;scheduler.tick();assert.equal(notifications.length,6);assert.equal(notifications[5].title,'拾序 · 到期提醒');
  const tomorrow=new Date(clock);tomorrow.setDate(tomorrow.getDate()+1);
  workspace={tasks:[{...task('future-batch',tomorrow.toISOString()),category:'batch'}],prefs:{batchTime:'00:00'}};
  scheduler.tick();assert.equal(notifications.length,6);
  console.log('Passed: scheduled-day visibility and original category, before-deadline timing, future batch suppression, Monday shortcut, date validation, grouped alerts, persistent deduplication, reschedule, completion/cancel/delete, disabled catch-up, restart catch-up.');
}finally{scheduler.close();}
