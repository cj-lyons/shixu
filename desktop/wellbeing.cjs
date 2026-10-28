const fs = require('node:fs');
const path = require('node:path');
const defaults = () => ({ move: { enabled:false, minutes:60 }, water: { enabled:false, minutes:45 }, workHours:true, start:'09:00', end:'18:00', idlePause:true, floralCard:true });
function validate(config) {
  if(!config||typeof config.workHours!=='boolean'||!['start','end'].every(key=>typeof config[key]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(config[key]))||config.start>=config.end)throw Error('提醒时段需在同一天内，结束时间应晚于开始时间');
  for(const key of ['move','water'])if(!config[key]||typeof config[key].enabled!=='boolean'||!Number.isInteger(config[key].minutes)||config[key].minutes<5||config[key].minutes>240)throw Error('提醒间隔需为 5—240 分钟');
  for(const key of ['idlePause','floralCard'])if(config[key]!==undefined&&typeof config[key]!=='boolean')throw Error('提醒选项无效');
  return {move:{enabled:config.move.enabled,minutes:config.move.minutes},water:{enabled:config.water.enabled,minutes:config.water.minutes},workHours:config.workHours,start:config.start,end:config.end,idlePause:config.idlePause??true,floralCard:config.floralCard??true};
}
function createWellbeing({file,now=Date.now,notify,getTimer=()=>null,getIdleSeconds=()=>null,isEnabled=()=>true,canNotify=()=>true,onChange=()=>{}}) {
  let config=defaults(),meetingUntil=null,naturalIdle=false;
  try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));config=validate(saved);if(Number.isFinite(saved.meetingUntil)&&saved.meetingUntil>now()&&saved.meetingUntil<=now()+3600000)meetingUntil=saved.meetingUntil;}catch{}
  function idle(){try{const value=getIdleSeconds();return Number.isFinite(value)&&value>=0?value:null;}catch{return null;}}
  let next={move:null,water:null},lastTick=now(),resting=false,lastSent=0;
  const time=current=>{const date=new Date(current);return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;};
  const inHours=current=>!config.workHours||(time(current)>=config.start&&time(current)<config.end);
  let activeHours=inHours(now()),wasEnabled=!!isEnabled();
  function schedule(current,minutes){const date=new Date(current);if(!inHours(current)){if(time(current)>=config.end)date.setDate(date.getDate()+1);const [h,m]=config.start.split(':').map(Number);date.setHours(h,m,0,0);}return date.getTime()+minutes*60000;}
  function resetAll(current){for(const key of ['move','water'])next[key]=config[key].enabled?schedule(current,config[key].minutes):null;}
  resetAll(now());
  function getState(){return {config:structuredClone(config),next:{...next},withinHours:inHours(now()),notificationsEnabled:!!isEnabled(),naturalIdle,meetingUntil,idleSupported:idle()!==null};}
  function changed(){onChange(getState());}
  function save(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({...config,meetingUntil}));fs.renameSync(file+'.tmp',file);}
  function tick(){const current=now(),timer=getTimer();const inRest=!!timer&&!timer.finished&&['short','long'].includes(timer.mode)&&!!timer.end;
    // Resume/restart starts a fresh interval. Do not turn time away into a backlog of alerts.
    if(current-lastTick>5*60000||current<lastTick||inRest!==resting||activeHours!==inHours(current)||wasEnabled!==!!isEnabled()){resetAll(current);changed();}lastTick=current;resting=inRest;activeHours=inHours(current);wasEnabled=!!isEnabled();
    const inactive=config.idlePause&&(idle()??0)>=300;
    if(inactive!==naturalIdle){naturalIdle=inactive;next.move=config.move.enabled?schedule(current,config.move.minutes):null;changed();}
    if(meetingUntil&&current>=meetingUntil){meetingUntil=null;save();resetAll(current);changed();}
    if(!isEnabled()||!inHours(current)||inRest||meetingUntil)return;
    const due=['move','water'].filter(key=>!(key==='move'&&naturalIdle)&&config[key].enabled&&next[key]!==null&&next[key]<=current);if(!due.length)return;
    // Let imminent focus completion and other software notifications take precedence.
    if(timer?.mode==='focus'&&!timer.finished&&timer.end&&timer.end-current>0&&timer.end-current<=2*60000){for(const key of due)next[key]=timer.end+5*60000;changed();return;}
    if(current-lastSent<60000||!canNotify())return;
    const body=due.length===2?'有空时起身活动一下，也给自己倒点水。':due[0]==='move'?'坐了一会儿，有空时起身走动、舒展一下。':'有空时喝点水，给自己一个短暂的停顿。';
    notify({key:'wellbeing:'+due.join('+')+':'+current,title:'拾序 · 照顾自己一下',body,wellbeingKeys:due,floralCard:config.floralCard});lastSent=current;
    for(const key of due)next[key]=schedule(current,config[key].minutes);changed();
  }
  return {getState,tick,resume(){lastTick=now();resetAll(lastTick);changed();return getState();},pause(minutes){if(![0,30,60].includes(minutes))throw Error('请选择暂停30分钟或1小时');const previous=meetingUntil;meetingUntil=minutes?now()+minutes*60000:null;try{save();}catch(error){meetingUntil=previous;throw error;}resetAll(now());changed();return getState();},configure(value){const parsed=validate(value),previous=config;config=parsed;try{save();}catch(error){config=previous;throw error;}if(previous.workHours!==config.workHours||previous.start!==config.start||previous.end!==config.end)resetAll(now());else for(const key of ['move','water'])if(previous[key].enabled!==config[key].enabled||previous[key].minutes!==config[key].minutes)next[key]=config[key].enabled?schedule(now(),config[key].minutes):null;if(previous.idlePause!==config.idlePause){naturalIdle=false;next.move=config.move.enabled?schedule(now(),config.move.minutes):null;}changed();return getState();},act(key,action){if(!['move','water'].includes(key)||!['done','snooze'].includes(action))throw Error('提醒操作无效');next[key]=config[key].enabled?schedule(now(),action==='snooze'?10:config[key].minutes):null;changed();return getState();},test(){if(!isEnabled())throw Error('请先开启软件提醒');notify({key:'wellbeing:test:'+now(),title:'拾序 · 照顾自己一下',body:'提醒示例：有空时起身活动一下，也给自己倒点水。',wellbeingKeys:['move','water'],floralCard:config.floralCard});return getState();}};
}
module.exports={createWellbeing,validate};
