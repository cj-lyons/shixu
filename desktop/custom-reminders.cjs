const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const repeats=['none','daily','weekdays','weekly'];
function nextOccurrence(at,repeat,now){
  if(repeat==='none')return null;
  const date=new Date(at);
  while(date.getTime()<=now||(repeat==='weekdays'&&[0,6].includes(date.getDay())))date.setDate(date.getDate()+(repeat==='weekly'?7:1));
  return date.getTime();
}
const occurrenceKey=item=>`${item.id}:${item.nextAt}`;
function createCustomReminders({file,now=Date.now,notify,isEnabled=()=>true,canShow=()=>true,onChange=()=>{},automatic=true}){
  let items=[],error='',closed=false;
  try{
    const saved=JSON.parse(fs.readFileSync(file,'utf8'));
    if(saved.version!==1||!Array.isArray(saved.items)||saved.items.length>100)throw Error('Invalid reminder file');
    const ids=new Set();
    for(const item of saved.items){
      if(!item||typeof item.id!=='string'||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>100||!repeats.includes(item.repeat)||typeof item.enabled!=='boolean'||typeof item.pending!=='boolean'||typeof item.announced!=='boolean'||![item.at,item.nextAt].every(n=>Number.isFinite(n)&&n>0&&n<4102444800000))throw Error('Invalid reminder');
      ids.add(item.id);
    }
    items=saved.items;
  }catch(e){if(e.code!=='ENOENT')error='自定义提醒文件无法读取，原文件已保留。请先备份并检查后重试。';}
  function persist(next){
    if(error)throw Error(error);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify({version:1,items:next},null,2));fs.renameSync(file+'.tmp',file);items=next;onChange();
  }
  function tick(quiet=false){
    if(error||closed)return;
    const current=now(),due=items.filter(i=>i.enabled&&i.nextAt<=current&&(!i.pending||!i.announced));
    if(!due.length)return;
    const keys=new Set(due.map(occurrenceKey));
    const show=!quiet&&isEnabled()&&canShow();
    persist(items.map(i=>keys.has(occurrenceKey(i))?{...i,pending:true,announced:true}:i));
    if(show){try{notify(due.map(i=>({...i,pending:true})));}catch{/* Pending entries remain available in the workspace. */}}
  }
  // Opening after a missed time records pending entries without a burst of popups.
  if(!error)tick(true);
  const interval=automatic?setInterval(()=>{try{tick();}catch(e){console.error('Custom reminder check failed:',e.name);}},1000):null;
  interval?.unref();
  return {
    getState:()=>({items:structuredClone(items),error}),tick,
    save(value){
      if(!value||typeof value.title!=='string'||!value.title.trim()||value.title.trim().length>100||!repeats.includes(value.repeat)||typeof value.at!=='string')throw Error('请填写提醒内容、时间和重复方式。');
      const at=Date.parse(value.at);if(!Number.isFinite(at)||at<=now()||at>=4102444800000)throw Error('请选择将来的提醒时间。');
      if(value.id!==undefined&&typeof value.id!=='string')throw Error('提醒编号无效。');
      const existing=value.id?items.find(i=>i.id===value.id):null;
      if(value.id&&!existing)throw Error('提醒已变更，请刷新后重试。');
      if(!existing&&items.length>=100)throw Error('最多保留100条提醒，请先清理已处理记录。');
      const item={id:existing?.id||randomUUID(),title:value.title.trim(),at,repeat:value.repeat,enabled:true,nextAt:value.repeat==='weekdays'?nextOccurrence(at,value.repeat,now()):at,pending:false,announced:false};
      persist(existing?items.map(i=>i.id===item.id?item:i):[...items,item]);return this.getState();
    },
    toggle(id){const item=items.find(i=>i.id===id);if(!item)throw Error('提醒不存在。');if(item.doneAt)throw Error('请编辑提醒，选择新的时间。');persist(items.map(i=>i.id===id?{...i,enabled:!i.enabled}:i));tick(true);return this.getState();},
    remove(id){if(typeof id!=='string'||!items.some(i=>i.id===id))throw Error('提醒不存在。');persist(items.filter(i=>i.id!==id));return this.getState();},
    act(key,action){
      const item=items.find(i=>occurrenceKey(i)===key&&i.pending&&i.enabled);
      if(!item||!['done','snooze'].includes(action))throw Error('提醒已更新，请刷新后重试。');
      const current=now(),next=action==='snooze'?current+600000:nextOccurrence(item.at,item.repeat,current);
      persist(items.map(i=>i.id!==item.id?i:{...i,nextAt:next??i.nextAt,enabled:next!==null,pending:false,announced:false,...(next===null?{doneAt:current}:{})}));return this.getState();
    },
    close(){closed=true;if(interval)clearInterval(interval);}
  };
}
module.exports={createCustomReminders,nextOccurrence,occurrenceKey};
