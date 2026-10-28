const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createWellbeing}=require('../desktop/wellbeing.cjs');
const root=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'shixu-wellbeing-'));
let clock=new Date(2026,9,27,10).getTime(),timer=null,enabled=true,quiet=false;
const sent=[],file=path.join(root,'wellbeing.json');
const create=()=>createWellbeing({file,now:()=>clock,notify:value=>sent.push(value),getTimer:()=>timer,isEnabled:()=>enabled,canNotify:()=>!quiet});
let service=create();
function advance(minutes){for(let i=0;i<minutes;i++){clock+=60000;service.tick();}}
const settings=()=>({...service.getState().config,workHours:false,move:{enabled:true,minutes:5},water:{enabled:true,minutes:5}});
assert.equal(service.getState().config.move.enabled,false);
service.configure(settings());advance(4);assert.equal(sent.length,0);advance(1);assert.equal(sent.length,1);assert.match(sent[0].body,/起身.*水/);
service.tick();assert.equal(sent.length,1);
service.act('water','snooze');const waterAt=service.getState().next.water;assert.equal(waterAt,clock+600000);
service.act('move','done');assert.equal(service.getState().next.water,waterAt);
const moveAt=service.getState().next.move;service.configure({...settings(),water:{enabled:false,minutes:5}});assert.equal(service.getState().next.move,moveAt);
advance(5);assert.equal(sent.length,2);assert.match(sent[1].body,/起身/);
// Sleep and restart reset an interval instead of replaying notifications.
clock+=3600000;service.tick();assert.equal(sent.length,2);assert.equal(service.getState().next.move,clock+300000);
service=create();assert.equal(service.getState().config.move.enabled,true);assert.equal(service.getState().config.water.enabled,false);assert.equal(service.getState().next.move,clock+300000);
timer={mode:'short',end:clock+600000,finished:false};service.tick();advance(8);assert.equal(sent.length,2);
timer=null;service.tick();advance(4);assert.equal(sent.length,2);advance(1);assert.equal(sent.length,3);
// Imminent focus completion yields to the timer's break notification.
service.act('move','done');advance(4);timer={mode:'focus',end:clock+120000,finished:false};advance(1);assert.equal(sent.length,3);assert.equal(service.getState().next.move,timer.end+300000);
timer=null;quiet=true;advance(7);assert.equal(sent.length,3);quiet=false;service.tick();assert.equal(sent.length,4);
enabled=false;service.tick();advance(8);assert.equal(sent.length,4);enabled=true;service.tick();advance(4);assert.equal(sent.length,4);advance(1);assert.equal(sent.length,5);
service.configure({...settings(),workHours:true,start:'09:00',end:'18:00'});clock=new Date(2026,9,27,20).getTime();service.tick();advance(5);assert.equal(sent.length,5);
clock=new Date(2026,9,28,9).getTime();service.tick();advance(4);assert.equal(sent.length,5);advance(1);assert.equal(sent.length,6);
assert.throws(()=>service.configure({...settings(),start:'18:00',end:'09:00'}));
assert.throws(()=>service.configure({...settings(),water:{enabled:true,minutes:0}}));
console.log('Passed: separate switches and intervals, grouped notifications, independent reset and snooze, sleep/restart, break suppression, timer priority, notification cooldown, global enable, quiet hours, validation.');

// Idle affects movement only; the OS signal is injected without reading or storing inputs.
let idleSeconds=0;
const idleFile=path.join(root,'idle.json');
const makeIdle=()=>createWellbeing({file:idleFile,now:()=>clock,getIdleSeconds:()=>idleSeconds,notify:value=>sent.push(value)});
service=makeIdle();service.configure(settings());const beforeIdle=sent.length;
idleSeconds=300;service.tick();assert.equal(service.getState().naturalIdle,true);
advance(5);assert.equal(sent.length,beforeIdle+1);assert.deepEqual(sent.at(-1).wellbeingKeys,['water']);
idleSeconds=0;service.tick();assert.equal(service.getState().next.move,clock+300000);assert.equal(service.getState().naturalIdle,false);
service.configure({...settings(),idlePause:false});idleSeconds=600;advance(5);assert.ok(sent.at(-1).wellbeingKeys.includes('move'));
service.configure({...settings(),idlePause:true});assert.equal(service.getState().config.idlePause,true);
assert.throws(()=>service.configure({...settings(),idlePause:'true'}));
// Meeting suppression survives a restart; expiry and manual resume start fresh intervals.
service.pause(30);const meetingUntil=clock+1800000;assert.equal(service.getState().meetingUntil,meetingUntil);
const meetingCount=sent.length;advance(10);assert.equal(sent.length,meetingCount);
service=makeIdle();assert.equal(service.getState().meetingUntil,meetingUntil);advance(20);assert.equal(sent.length,meetingCount);
assert.equal(service.getState().meetingUntil,null);assert.equal(service.getState().next.water,clock+300000);
advance(5);assert.equal(sent.length,meetingCount+1);
service.pause(60);service.pause(0);assert.equal(service.getState().meetingUntil,null);assert.equal(service.getState().next.water,clock+300000);
assert.throws(()=>service.pause(120));
// Old 1.10 settings migrate with intervals intact, unsupported idle falls back to the timer.
fs.writeFileSync(idleFile,JSON.stringify({move:{enabled:true,minutes:45},water:{enabled:false,minutes:30},workHours:false,start:'09:00',end:'18:00'}));
service=createWellbeing({file:idleFile,now:()=>clock,getIdleSeconds:()=>{throw Error('unsupported');},notify:()=>{}});
assert.equal(service.getState().config.move.minutes,45);assert.equal(service.getState().config.idlePause,true);assert.equal(service.getState().idleSupported,false);
console.log('Passed: optional idle / movement-only suppression, active reset, meeting pause and persistence, expiry and manual resume, legacy migration, unsupported idle fallback.');
const {createReminders}=require('../desktop/reminders.cjs');
const regular=[],taskAt=clock+60000;
const reminders=createReminders({file:path.join(root,'meeting','reminders.json'),now:()=>clock,getWorkspace:()=>({prefs:{batchTime:'23:59'},tasks:[{id:'due',title:'保持任务提醒',done:false,due:new Date(taskAt).toISOString()}]}),notify:value=>regular.push(value),onTimer:()=>{}});
try{
 reminders.syncTimer({id:'focus',mode:'focus',duration:60,remaining:60,end:taskAt,finished:false});
 reminders.wellbeing.pause(30);clock=taskAt;reminders.tick();
 assert.ok(regular.some(value=>value.key==='timer:focus'));
 assert.ok(regular.some(value=>value.key.startsWith('due:due:')));
 assert.equal(reminders.wellbeing.getState().meetingUntil,taskAt-60000+1800000);
 console.log('Passed: Pomodoro completion and task deadline still notify during meeting pause.');
}finally{reminders.close();}
