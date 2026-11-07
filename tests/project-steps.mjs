import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {taskSchema,DATA_FORMAT_VERSION} from '../src/model.ts';
import {updateProject,currentProjectStep,canFinishTask,describeProject} from '../src/project-steps.ts';
import {taskInSection} from '../src/task-reminders.ts';
import {startServer} from '../server/index.mjs';
const {createReminders}=createRequire(import.meta.url)('../desktop/reminders.cjs');
const ordinary={id:'p',title:'培训方案',category:'inbox',owner:'',from:'',standard:'',estimate:25,energy:'medium',done:false,coreDate:'',due:'',created:'2026-10-30T01:00:00.000Z'};
assert.equal(taskSchema.parse(ordinary).project,undefined);assert.equal(canFinishTask(ordinary),true);
let task={...ordinary,project:{enabled:true,steps:[],history:[]}};
const at='2026-10-30T02:00:00.000Z';
task=updateProject(task,{kind:'added',input:{title:'整理方案',owner:'我',followUpAt:''}},at);
task=updateProject(task,{kind:'added',input:{title:'等方向确认',owner:'袁部',followUpAt:'2026-11-02T01:00:00.000Z'}},at);
const original=structuredClone(task),first=task.project.steps[0].id,second=task.project.steps[1].id;
assert.throws(()=>updateProject(task,{kind:'completed',id:second},at),/当前步骤/);
assert.equal(canFinishTask(task),false);assert.equal(taskSchema.safeParse({...task,done:true}).success,false);
task=updateProject(task,{kind:'completed',id:first},at);assert.equal(task.done,false);assert.equal(currentProjectStep(task).id,second);assert.equal(task.project.steps[0].completedAt,at);assert.equal(original.project.steps[0].done,false);
assert.throws(()=>updateProject(task,{kind:'completed',id:first},at),/已经完成/);
task=updateProject(task,{kind:'adjusted',id:second,input:{title:'等袁部确定培训方向',owner:'袁部',followUpAt:'2026-11-03T01:00:00.000Z',note:'先确定方向，再选老师'}},at);
assert.equal(task.project.history.at(-1).previousTitle,'等方向确认');assert.equal(task.project.history.at(-1).note,'先确定方向，再选老师');assert.equal(task.project.history[0].kind,'added');
assert.match(describeProject(task.project),/当前：等袁部/);assert.match(describeProject(task.project),/先确定方向/);assert.doesNotMatch(describeProject(task.project),/\[object Object\]/);
assert.equal(taskInSection(task,'today','2026-11-02'),false);assert.equal(taskInSection(task,'today','2026-11-03'),true);
assert.equal(taskInSection({...task,project:{...task.project,enabled:false}},'today','2026-11-03'),false);
assert.equal(currentProjectStep({...task,project:{...task.project,enabled:false}}),undefined);
const duplicate=structuredClone(task);duplicate.project.steps[1].id=first;assert.equal(taskSchema.safeParse(duplicate).success,false);
assert.throws(()=>updateProject(task,{kind:'added',input:{title:'  ',owner:'',followUpAt:''}},at),/请填写/);
// Completing all steps does not finish the project. The user explicitly finishes it later.
const finished=updateProject(task,{kind:'completed',id:second},at);assert.equal(finished.done,false);assert.equal(canFinishTask(finished),true);assert.equal(taskSchema.safeParse({...finished,done:true}).success,true);
const continuation=updateProject(finished,{kind:'added',input:{title:'选择老师',owner:'我',followUpAt:''}},at);assert.equal(currentProjectStep(continuation).title,'选择老师');assert.equal(continuation.project.history.length,finished.project.history.length+1);
// Only the current step reminds; reminders deduplicate and survive a scheduler restart.
mkdirSync('output',{recursive:true});const folder=mkdtempSync(path.resolve('output/project-check-'));
let clock=Date.parse('2026-11-03T01:00:00.000Z'),workspace={tasks:[original],prefs:{batchTime:'23:59'}};const sent=[];
const make=()=>createReminders({file:path.join(folder,'reminders.json'),getWorkspace:()=>workspace,now:()=>clock,notify:value=>sent.push(value),onTimer:()=>{}});
let reminders=make();reminders.tick();assert.equal(sent.length,0,'Future steps cannot notify before the current step finishes');workspace={...workspace,tasks:[task]};reminders.tick();assert.equal(sent.length,1);assert.match(sent[0].body,/等袁部确定/);reminders.tick();assert.equal(sent.length,1);reminders.close();reminders=make();reminders.tick();assert.equal(sent.length,1);
workspace={...workspace,tasks:[finished]};clock+=1000;reminders.tick();assert.equal(sent.length,1);reminders.close();
// A format-3 database is backed up and migrated without altering existing tasks.
const dataDir=path.join(folder,'migration');let server=await startServer({dataDir,desktop:true,host:'127.0.0.1',port:0});
const headers={Cookie:'shixu_session='+server.token,'Content-Type':'application/json'};
let env=await (await fetch(server.url+'/api/workspace',{headers})).json();
await fetch(server.url+'/api/workspace',{method:'PUT',headers,body:JSON.stringify({data:{...env.data,tasks:[ordinary]},revision:env.revision,formatVersion:DATA_FORMAT_VERSION})});await server.close();
const db=new DatabaseSync(path.join(dataDir,'shixu.sqlite'));db.prepare("UPDATE app_meta SET value='3' WHERE key='dataFormat'").run();db.close();
server=await startServer({dataDir,desktop:true,host:'127.0.0.1',port:0});
try{
 const h={Cookie:'shixu_session='+server.token,'Content-Type':'application/json'};env=await (await fetch(server.url+'/api/workspace',{headers:h})).json();assert.equal(env.formatVersion,4);assert.deepEqual(env.data.tasks,[ordinary]);assert.ok(readdirSync(path.join(dataDir,'schema-backups')).some(name=>name.startsWith('before-format-4-')));
 const old=await fetch(server.url+'/api/workspace',{method:'PUT',headers:h,body:JSON.stringify({data:env.data,revision:env.revision,formatVersion:3})});assert.equal(old.status,400);assert.deepEqual((await (await fetch(server.url+'/api/workspace',{headers:h})).json()).data,env.data);
}finally{await server.close();}
console.log('Passed: ordinary tasks unchanged, ordered steps, project completion guard, immutable completion/adjustment snapshots, optional follow-up and native deduplication, continuation, validation, format-3 backup/migration and old-client write rejection.');
