import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonical, equal, conflicts, localChanges, materialize, mergeRecords, newState, validateSnapshot } from './sync-records.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const decodeXML=s=>s.replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi,v=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[v]||String.fromCodePoint(v[2].toLowerCase()==='x'?parseInt(v.slice(3,-1),16):Number(v.slice(2,-1)))));
const failure=message=>Object.assign(Error(message),{status:400});
const CHANGE_SYNC_DELAY=30_000, PERIODIC_SYNC_INTERVAL=10*60_000;

export function createWebdavSync({db,userId,dataDir,secrets,endpoint='https://dav.jianguoyun.com/dav/'}){
 db.exec('CREATE TABLE IF NOT EXISTS cloud_sync(user_id TEXT PRIMARY KEY,state TEXT NOT NULL,secret TEXT);');
 const current=()=>{const row=db.prepare('SELECT data,revision FROM workspaces WHERE user_id=?').get(userId);return {data:JSON.parse(row.data),revision:row.revision};};
 const row=()=>db.prepare('SELECT state,secret FROM cloud_sync WHERE user_id=?').get(userId);
 const state=()=>{const r=row();return r?JSON.parse(r.state):newState(current().data);};
 const store=s=>db.prepare('INSERT INTO cloud_sync(user_id,state) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state').run(userId,JSON.stringify(s));
 if(!row())store(newState(current().data));
 else{const saved=state(),data=current().data;store(localChanges(saved,materialize(saved.records,data),data));}
 let running=false,closed=false,delay,automatic,preview;
 const status=()=>{const s=state(),r=row();return {available:!!secrets,configured:!!r.secret,running,pending:!!r.secret&&s.uploaded!==digest(s.records),lastAt:s.lastAt,error:s.error||'',folder:s.folder||'拾序同步',account:s.account||'',conflicts:conflicts(s.records)};};
 const config=body=>{if(!body||typeof body.account!=='string'||!body.account.trim()||body.account.length>200||typeof body.password!=='string'||!body.password||body.password.length>512||typeof body.folder!=='string'||!body.folder.trim()||body.folder.length>80||/[\\/\u0000-\u001f]/.test(body.folder)||['.','..'].includes(body.folder.trim()))throw failure('请填写账号、应用密码和单层同步目录名。');return {account:body.account.trim(),password:body.password,folder:body.folder.trim()};};
 async function request(c,name,init={}){
  if(closed)throw failure('程序正在关闭，请稍后重试。');
  const base=new URL(encodeURIComponent(c.folder)+'/',endpoint),url=new URL(name,base);
  const response=await fetch(url,{...init,redirect:'error',headers:{Authorization:'Basic '+Buffer.from(c.account+':'+c.password).toString('base64'),...init.headers},signal:AbortSignal.timeout(20000)}).catch(()=>{throw failure('无法连接坚果云，请检查网络后重试。');});
  if([401,403].includes(response.status))throw failure('坚果云授权失败，请检查账号及应用密码。');
  if(response.status===429)throw failure('坚果云请求较多，已保留本机修改，请稍后重试。');
  return response;
 }
 async function bodyText(response,max=8_000_000){
  let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>max){await response.body.cancel().catch(()=>{});throw failure('云端同步文件过大，已停止导入。');}chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');
 }
 async function ensure(c){const r=await request(c,'',{method:'MKCOL'});if(![201,405].includes(r.status))throw failure('无法建立同步目录，请检查坚果云权限。');}
 async function download(c){
  const r=await request(c,'',{method:'PROPFIND',headers:{Depth:'1','Content-Type':'application/xml; charset=utf-8'},body:'<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getetag/></d:prop></d:propfind>'});
  if(r.status!==207)throw failure('无法读取坚果云同步目录。');
  const xml=await bodyText(r,2_000_000);if(!/<(?:[\w.-]+:)?multistatus\b/.test(xml))throw failure('坚果云目录响应无效。');
  const hrefs=[...xml.matchAll(/<(?:[\w.-]+:)?href\b[^>]*>([^<]*)<\/(?:[\w.-]+:)?href\s*>/g)].map(m=>decodeXML(m[1].trim()));
  if(!hrefs.length)throw failure('坚果云目录为空或无法解析。');
  const base=new URL(encodeURIComponent(c.folder)+'/',endpoint),files=new Set();
  for(const href of hrefs){const url=new URL(href,base),pathname=decodeURIComponent(url.pathname),basepath=decodeURIComponent(base.pathname);if(url.origin!==base.origin)throw failure('云端目录返回了无效路径。');if(pathname.replace(/\/$/,'')===basepath.replace(/\/$/,''))continue;if(!pathname.startsWith(basepath))throw failure('云端目录返回了无效路径。');const name=pathname.slice(basepath.length);if(/^device-[-a-f0-9]{36}\.json$/.test(name))files.add(name);}
  if(files.size>50||hrefs.length>=500)throw failure('同步设备或目录条目过多，请检查同步目录。');
  const snapshots=[];let total=0;
  for(const name of files){const response=await request(c,name);if(response.status!==200)throw failure('云端同步文件读取失败，尚未更改本机数据。');const text=await bodyText(response);total+=Buffer.byteLength(text);if(total>40_000_000)throw failure('同步空间过大，请先归档。');let snapshot;try{snapshot=validateSnapshot(JSON.parse(text));}catch{throw failure('云端数据格式无效或版本不兼容，请确认两台电脑均已升级，尚未导入。');}if(name!==`device-${snapshot.device}.json`)throw failure('云端设备文件标识不一致。');snapshots.push({snapshot,etag:response.headers.get('etag')});}
  return snapshots;
 }
 async function test(body){
  if(!secrets)throw failure('当前环境不能安全保存应用密码，请重启更新后的桌面版。');
  if(running)throw failure('正在同步，请稍后再测试。');
  const c=config(body);await ensure(c);const probe='connection-'+randomUUID()+'.txt',token=randomUUID();
  try{const p=await request(c,probe,{method:'PUT',headers:{'If-None-Match':'*','Content-Type':'text/plain'},body:token});if(![200,201,204].includes(p.status))throw failure('同步目录无法写入。');const g=await request(c,probe);if(g.status!==200||await bodyText(g,1000)!==token)throw failure('同步目录读写校验失败。');}
  finally{await request(c,probe,{method:'DELETE'}).catch(()=>{});}
  const snapshots=await download(c);let records={};for(const item of snapshots)records=mergeRecords(records,item.snapshot.records);
  const local=state(),combined=mergeRecords(local.records,records);
  materialize(combined,current().data);
  const previewToken=randomUUID();preview={token:previewToken,hash:digest(c),expires:Date.now()+300000};
  return {previewToken,devices:snapshots.length,localTasks:current().data.tasks.length,remoteTasks:Object.entries(records).filter(([key,v])=>key.startsWith('task:')&&v.some(x=>x.value!==null)).length,conflicts:conflicts(combined).length};
 }
 function changed(before,after){const s=state();store({...localChanges(s,before,after),error:''});if(row().secret){clearTimeout(delay);delay=setTimeout(()=>void run(),CHANGE_SYNC_DELAY);delay.unref();}}
 function save(body){
  if(running)throw failure('正在同步，请稍后重试。');if(!secrets)throw failure('系统凭据保护暂不可用。');const c=config(body),s=state();if(!preview||preview.token!==body.previewToken||preview.expires<Date.now()||preview.hash!==digest(c))throw failure('请先测试连接并确认同步预览，再连接。');
  if(row().secret&&(s.folder!==c.folder||s.account!==c.account))throw failure('请先断开原同步空间，再连接新的空间。');
  const secret=secrets.encrypt(JSON.stringify(c));store({...s,folder:c.folder,account:c.account,error:''});db.prepare('UPDATE cloud_sync SET secret=? WHERE user_id=?').run(secret,userId);
  return status();
 }
 async function run(){
  if(running||closed||!row().secret)return status();running=true;
  try{
   let c;try{c=JSON.parse(secrets.decrypt(row().secret));}catch{throw failure('本机保存的应用密码无法解密，请点击“更新应用密码”，重新填写并测试连接。');}const snapshots=await download(c);let remote={};for(const item of snapshots)remote=mergeRecords(remote,item.snapshot.records);
   // Read current local state only AFTER all network reads. Local writes can continue during I/O.
   let s=state();const before=current(),records=mergeRecords(s.records,remote),data=materialize(records,before.data);
   if(!equal(data,before.data)){
    const dir=path.join(dataDir,'sync-backups');mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'before-merge-'+Date.now()+'-'+randomUUID()+'.json'),JSON.stringify({format:1,created:new Date().toISOString(),data:before.data}),{flag:'wx'});
   }
   db.exec('BEGIN IMMEDIATE');try{store({...s,records,error:''});if(!equal(data,before.data))db.prepare('UPDATE workspaces SET data=?,revision=revision+1 WHERE user_id=?').run(JSON.stringify(data),userId);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
   s=state();const snapshot={format:2,device:s.device,records:s.records},uploaded=digest(s.records),own=snapshots.find(x=>x.snapshot.device===s.device);
   if(own&&!own.etag)throw failure('网盘未提供文件版本保护，已停止上传。');
   const response=await request(c,`device-${s.device}.json`,{method:'PUT',headers:{'Content-Type':'application/json; charset=utf-8',...(own?{'If-Match':own.etag}:{'If-None-Match':'*'})},body:JSON.stringify(snapshot)});
   if(response.status===412)throw failure('云端刚有新修改，请再次同步；本机修改已保留。');if(![200,201,204].includes(response.status))throw failure('同步上传未完成，本机修改已保留。');
   const verified=await request(c,`device-${s.device}.json`);if(verified.status!==200)throw failure('上传后读取校验失败，请重试。');const value=validateSnapshot(JSON.parse(await bodyText(verified)));if(value.device!==s.device||digest(value.records)!==uploaded)throw failure('上传内容校验未通过，请重试。');
   store({...state(),uploaded,lastAt:new Date().toISOString(),error:''});
  }catch(e){store({...state(),error:e.status?e.message:'同步未完成，请检查网络或云端数据后重试。'});}
  finally{running=false;}
  return status();
 }
 function resolve(body){
  if(running)throw failure('请等待本次同步结束再处理冲突。');const s=state(),versions=s.records[body?.key];
  if(!versions||versions.length<2||!versions.some(v=>equal(v,body.version)))throw failure('冲突内容已变化，请刷新后重新选择。');
  const clock={};for(const v of versions)for(const [id,n]of Object.entries(v.clock))clock[id]=Math.max(clock[id]||0,n);
  const counter=Math.max(s.counter,clock[s.device]||0)+1;clock[s.device]=counter;
  const records={...s.records,[body.key]:[{clock,value:body.version.value}]},before=current(),data=materialize(records,before.data);
  db.exec('BEGIN IMMEDIATE');try{store({...s,counter,records,error:''});db.prepare('UPDATE workspaces SET data=?,revision=revision+1 WHERE user_id=?').run(JSON.stringify(data),userId);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  clearTimeout(delay);delay=setTimeout(()=>void run(),CHANGE_SYNC_DELAY);delay.unref();return status();
 }
 function disconnect(){if(running)throw failure('请等待同步结束后断开。');const s=newState(current().data);db.prepare('UPDATE cloud_sync SET state=?,secret=NULL WHERE user_id=?').run(JSON.stringify(s),userId);clearTimeout(delay);return status();}
 automatic=setInterval(()=>void run(),PERIODIC_SYNC_INTERVAL);automatic.unref();delay=setTimeout(()=>void run(),15000);delay.unref();
 return {status,test,save,run,changed,resolve,disconnect,close:async()=>{closed=true;clearInterval(automatic);clearTimeout(delay);while(running)await new Promise(r=>setTimeout(r,50));}};
}
