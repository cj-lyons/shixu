const fs = require('node:fs');
const path = require('node:path');
const { createWellbeing } = require('./wellbeing.cjs');

function validTimer(value) {
  if (value === null) return null;
  if (!value || typeof value.id !== 'string' || value.id.length > 100 || !['focus', 'short', 'long'].includes(value.mode) || !Number.isInteger(value.duration) || value.duration < 1 || value.duration > 7200 || !Number.isFinite(value.remaining) || value.remaining < 0 || value.remaining > 7200 || (value.end !== null && (!Number.isFinite(value.end) || value.end < 0)) || typeof value.finished !== 'boolean') throw Error('计时状态无效');
  return { id: value.id, ...(typeof value.goal==='string'?{goal:value.goal.slice(0,300)}:{}), ...(value.prepared === true ? { prepared: true } : {}), mode: value.mode, duration: value.duration, remaining: value.remaining, end: value.end, finished: value.finished, ...(Number.isFinite(value.finishedAt) ? { finishedAt: value.finishedAt } : {}), taskId: String(value.taskId || '').slice(0, 100), title: String(value.title || '').slice(0, 300) };
}

function createReminders({ file, getWorkspace, notify, onTimer, onWellbeing = () => {}, getIdleSeconds=()=>null, wellbeingAllowed=()=>true, supported = true, now = Date.now }) {
  let state = { enabled: supported, timer: null, sent: [] }, lastNotification = null;
  try { const saved = JSON.parse(fs.readFileSync(file, 'utf8')); state = { enabled: supported && saved.enabled !== false, timer: validTimer(saved.timer ?? null), sent: Array.isArray(saved.sent) ? saved.sent.filter(x => typeof x === 'string').slice(-10000) : [] }; } catch { /* First launch or damaged settings: start with safe defaults. */ }
  function save() { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(state)); fs.renameSync(file + '.tmp', file); }
  function send(key, title, body, extra={}) {
    if (!state.enabled || state.sent.includes(key)) return;
    state.sent.push(key); state.sent = state.sent.slice(-10000); save();
    lastNotification = { key, title, status: 'requested', at: now() };
    try { notify({ key, title, body, ...extra }, status => { lastNotification = { key, title, status, at: now() }; }); } catch { lastNotification.status = 'failed'; }
  }
  function tick() {
    const current = now(), timer = state.timer;
    if (timer?.end && !timer.finished && current >= timer.end) {
      state.timer = { ...timer, end: null, finishedAt: timer.end, remaining: 0, finished: true }; save();
      send('timer:' + timer.id, '拾序 · 计时结束', timer.mode === 'focus' ? '这一段专注结束了，起身喝水，休息一下。' : '休息结束了，准备好再开始下一段。');
      onTimer(state.timer);
    }
    const workspace = getWorkspace(); if (!workspace || !state.enabled) { wellbeing.tick(); return; }
    const date = new Date(current), day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const hhmm = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const active = workspace.tasks.filter(task => !task.done);
    const planned = active.filter(task => task.remindAt && Number.isFinite(Date.parse(task.remindAt)) && Date.parse(task.remindAt) <= current && !state.sent.includes('planned:' + task.id + ':' + task.remindAt)).sort((a,b)=>Date.parse(a.remindAt)-Date.parse(b.remindAt));
    if (planned.length) {
      const keys = planned.map(task => 'planned:' + task.id + ':' + task.remindAt);
      const names = planned.slice(0,3).map(task => `「${task.title.slice(0,50)}」`).join('、');
      send(keys[0], '拾序 · 待办提醒', `${planned.length===1?'该处理这件事了：':`有 ${planned.length} 件待办需要关注：`}${names}${planned.length>3?'等':''}。有空时打开拾序查看。`);
      state.sent = [...new Set([...state.sent, ...keys])].slice(-10000); save();
    }
    const dayOf=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    if (hhmm >= workspace.prefs.batchTime && active.some(task => task.category === 'batch' && (!task.remindAt || dayOf(task.remindAt)<=day || task.coreDate===day || task.due&&dayOf(task.due)<=day))) send('batch:' + day + ':' + workspace.prefs.batchTime, '拾序 · 集中处理', '到了集中处理时间，有空时一起处理零碎事项。');
    const due = active.filter(task => task.due && Number.isFinite(Date.parse(task.due)) && Date.parse(task.due) <= current && !state.sent.includes('due:' + task.id + ':' + task.due));
    if (due.length) {
      const keys = due.map(task => 'due:' + task.id + ':' + task.due);
      send(keys[0], '拾序 · 到期提醒', due.length === 1 ? `「${due[0].title}」已到期，请检查今日安排和交接。` : `有 ${due.length} 件事项已到期，请检查今日安排和交接。`);
      state.sent = [...new Set([...state.sent, ...keys])].slice(-10000); save();
    }
    wellbeing.tick();
  }
  const wellbeing=createWellbeing({file:path.join(path.dirname(file),'wellbeing.json'),now,getIdleSeconds,getTimer:()=>state.timer,isEnabled:()=>state.enabled,canNotify:()=>wellbeingAllowed()&&(!lastNotification||now()-lastNotification.at>=60000),onChange:onWellbeing,notify:message=>send(message.key,message.title,message.body,{wellbeingKeys:message.wellbeingKeys,floralCard:message.floralCard})});
  const interval = setInterval(() => { try { tick(); } catch (error) { console.error('Reminder check failed:', error.name); } }, 1000);
  return {
    getState: () => ({ enabled: state.enabled, supported, timer: state.timer, lastNotification }),
    syncTimer: value => { const next = validTimer(value); tick(); if (next && next.id === state.timer?.id && state.timer.finished && !next.finished) return state.timer; state.timer = next; save(); tick(); return state.timer; },
    enable: enabled => { state.enabled = supported && !!enabled; save(); return { enabled: state.enabled, supported }; },
    test: () => { if (!state.enabled || !supported) return false; send('test:' + now(), '拾序 · 软件提醒已开启', '关闭窗口后，拾序会在右下角托盘继续提醒。点击这条通知可打开工作台。'); return true; },
    wellbeing, tick, close: () => clearInterval(interval)
  };
}
module.exports = { createReminders, validTimer };
