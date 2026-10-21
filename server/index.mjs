import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataSchema, emptyData, DATA_FORMAT_VERSION } from '../src/model.ts';
import { createWebdavSync } from './webdav-sync.mjs';
import { serveAudio } from './audio-stream.mjs';
import { personalLibrary } from './personal-music.mjs';
import { createFlowerContent } from './flower-content.mjs';

const scrypt=promisify(scryptCallback),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function startServer(options={}) {
const appRoot=options.root||root;
const dataDir=options.dataDir||process.env.DATA_DIR||path.join(appRoot,'data');mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'shixu.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
const oldFormat=Number(db.prepare("SELECT value FROM app_meta WHERE key='dataFormat'").get()?.value||1);
if(oldFormat<DATA_FORMAT_VERSION){
 if(db.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n>0){const backupDir=path.join(dataDir,'schema-backups');mkdirSync(backupDir,{recursive:true});db.prepare('VACUUM INTO ?').run(path.join(backupDir,'before-1.8.0-'+Date.now()+'-'+randomBytes(4).toString('hex')+'.sqlite'));}
 db.prepare("INSERT INTO app_meta(key,value) VALUES('dataFormat',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(DATA_FORMAT_VERSION));
}
const flowerContent=createFlowerContent(db);
const hash=token=>createHash('sha256').update(token).digest('hex');
const passwordKey=async(p,s)=>Buffer.from(await scrypt(p,s,64));
if(!db.prepare('SELECT id FROM users LIMIT 1').get()){
 const username=options.desktop?'本机工作台':process.env.BOOTSTRAP_USERNAME,password=options.desktop?randomBytes(32).toString('hex'):process.env.BOOTSTRAP_PASSWORD;
 if(!username||!password||password.length<12)throw Error('首次启动必须设置账号及至少12位密码');
 const salt=randomBytes(24).toString('hex'),key=await passwordKey(password,salt);
 db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(randomBytes(16).toString('hex'),username,key.toString('hex'),salt);
 console.log('已初始化独立账号。');
}
// Credentials are needed only for first startup; passwords are stored as salted scrypt hashes.
delete process.env.BOOTSTRAP_PASSWORD;
const cookieSecure=!options.desktop&&process.env.COOKIE_SECURE==='true',cookieName='shixu_session';
const cookie=(token,age)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${cookieSecure?'; Secure':''}`;
const json=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));};
const readJson=async req=>{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>3_000_000)throw Object.assign(Error('数据过大，请导出归档'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Object.assign(Error('请求格式无效'),{status:400});}};
function auth(req){const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(hash(token),Date.now());}
let cloudSync;
if(options.desktop){const owner=db.prepare('SELECT id FROM users LIMIT 1').get();db.prepare('INSERT OR IGNORE INTO workspaces(user_id,data) VALUES(?,?)').run(owner.id,JSON.stringify(emptyData()));cloudSync=createWebdavSync({db,userId:owner.id,dataDir,secrets:options.syncSecrets,...(options.syncEndpoint?{endpoint:options.syncEndpoint}:{})});}
const failures=new Map();
const cleanupTimer=setInterval(()=>{db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());for(const [k,v]of failures)if(v.until<Date.now())failures.delete(k);},60000).unref();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 try{
  if(options.desktop&&req.headers.host!==`127.0.0.1:${server.address().port}`)return json(res,403,{error:'请求地址无效'});
  const url=new URL(req.url,'http://localhost'),route=url.pathname;
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))return json(res,403,{error:'请求来源无效'});}
  if(route==='/healthz')return json(res,200,{ok:true});
  if(route==='/api/login'&&req.method==='POST'){
   const body=await readJson(req);if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>100||body.password.length>256)return json(res,400,{error:'账号或密码格式无效'});
   const rateKey=req.socket.remoteAddress+'|'+body.username;const rate=failures.get(rateKey);if(rate&&rate.until>Date.now()&&rate.count>=8)return json(res,429,{error:'尝试次数较多，请10分钟后重试'});
   const user=db.prepare('SELECT * FROM users WHERE username=?').get(body.username);const expected=user?Buffer.from(user.password_hash,'hex'):Buffer.alloc(64);const actual=await passwordKey(body.password,user?.salt||'unknown-user');
   if(!user||!timingSafeEqual(expected,actual)){failures.set(rateKey,{count:(rate?.until>Date.now()?rate.count:0)+1,until:Date.now()+600000});return json(res,401,{error:'账号或密码不正确'});}
   failures.delete(rateKey);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*86400000);
   return json(res,200,{id:user.id,username:user.username},{'Set-Cookie':cookie(token,7*86400)});
  }
  if(route==='/signout'&&options.desktop)return json(res,405,{error:'桌面版自动打开本机工作台'});
  if(route==='/signout'&&req.method==='POST'){
   const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
   res.writeHead(303,{'Location':'/','Set-Cookie':cookie('',0),'Cache-Control':'no-store'});return res.end();
  }
  if(route.startsWith('/api/')){
   const user=auth(req);if(!user)return json(res,401,{error:'请重新登录'});
   if(route==='/api/flower-messages'&&req.method==='GET')return json(res,200,flowerContent.read(user.id,false));
   if(route==='/api/content/flower-messages'&&req.method==='GET')return json(res,200,flowerContent.read(user.id));
   if(route==='/api/content/flower-messages/bootstrap'&&req.method==='POST')return json(res,200,flowerContent.bootstrap(user.id,await readJson(req)));
   if(route==='/api/content/flower-messages'&&req.method==='POST')return json(res,200,flowerContent.mutate(user.id,'POST',null,await readJson(req)));
   if(route.startsWith('/api/content/flower-messages/')&&['PUT','DELETE'].includes(req.method)){const id=route.slice('/api/content/flower-messages/'.length);return json(res,200,flowerContent.mutate(user.id,req.method,id,await readJson(req)));}
   if(options.desktop&&['GET','HEAD'].includes(req.method)&&route.startsWith('/api/personal-music')){
    const library=await personalLibrary(options.getMusicDirectory?.());
    if(route==='/api/personal-music'){const {files,...result}=library;return json(res,200,result);}
    const id=route.slice('/api/personal-music/audio/'.length),file=library.files.get(id);
    if(!route.startsWith('/api/personal-music/audio/')||!file)return json(res,404,{error:'这首歌已不在当前本机曲库中，请重新选择。'});
    return serveAudio(req,res,file,json);
   }
   if(route==='/api/me'&&req.method==='GET')return json(res,200,{...user,...(options.desktop?{desktop:true}:{})});
   if(route.startsWith('/api/sync')&&cloudSync){
    if(route==='/api/sync'&&req.method==='GET')return json(res,200,cloudSync.status());
    if(req.method==='POST'){
     if(route==='/api/sync/test')return json(res,200,await cloudSync.test(await readJson(req)));
     if(route==='/api/sync/connect'){cloudSync.save(await readJson(req));return json(res,200,await cloudSync.run());}
     if(route==='/api/sync/run')return json(res,200,await cloudSync.run());
     if(route==='/api/sync/resolve')return json(res,200,cloudSync.resolve(await readJson(req)));
     if(route==='/api/sync/disconnect')return json(res,200,cloudSync.disconnect());
    }
   }
   if(route==='/api/workspace'){
    if(req.method==='GET'){db.prepare('INSERT OR IGNORE INTO workspaces(user_id,data) VALUES(?,?)').run(user.id,JSON.stringify(emptyData()));const row=db.prepare('SELECT data,revision FROM workspaces WHERE user_id=?').get(user.id);return json(res,200,{data:JSON.parse(row.data),revision:row.revision,formatVersion:DATA_FORMAT_VERSION});}
    if(req.method==='PUT'){const body=await readJson(req);if(body.formatVersion!==DATA_FORMAT_VERSION)return json(res,400,{error:'数据格式已更新，请完全退出后打开新版拾序再保存。旧客户端不能覆盖新格式。'});const parsed=dataSchema.safeParse(body.data);if(!parsed.success||!Number.isSafeInteger(body.revision)||body.revision<0)return json(res,400,{error:'内容不完整或超出容量'});db.exec('BEGIN IMMEDIATE');try{const previous=db.prepare('SELECT data FROM workspaces WHERE user_id=?').get(user.id);const result=db.prepare('UPDATE workspaces SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').run(JSON.stringify(parsed.data),user.id,body.revision);if(!result.changes){db.exec('ROLLBACK');return json(res,409,{error:'另一台设备已更新，请核对后重试'});}cloudSync?.changed(JSON.parse(previous.data),parsed.data);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return json(res,200,{revision:body.revision+1});}
   }
   return json(res,404,{error:'接口不存在'});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'请求方法不支持'});
  const dist=path.join(appRoot,'dist'),file=path.resolve(dist,'.'+decodeURIComponent(route));if(file!==dist&&!file.startsWith(dist+path.sep))return json(res,403,{error:'路径无效'});
  let target=file;try{if(!(await stat(target)).isFile())target=path.join(dist,'index.html');}catch{if(path.extname(route))return json(res,404,{error:'文件不存在'});target=path.join(dist,'index.html');}
  if(path.extname(target)==='.mp3')return serveAudio(req,res,target,json);
  const content=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':target.includes(path.sep+'assets'+path.sep)?'public,max-age=31536000,immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'服务暂时不可用，请稍后重试'});else res.end();console.error('request error:',e.name);}
});
server.requestTimeout=30000;server.headersTimeout=10000;
let token;
if(options.desktop){
 const user=db.prepare('SELECT id FROM users LIMIT 1').get();
 db.prepare('DELETE FROM sessions').run();
 token=randomBytes(32).toString('hex');
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+365*86400000);
}
try { await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(options.port??Number(process.env.PORT||3000),options.host||'0.0.0.0',resolve);}); }
catch(error){clearInterval(cleanupTimer);db.close();throw error;}
return {server,token,url:`http://127.0.0.1:${server.address().port}`,
 getWorkspace:()=>{const row=db.prepare('SELECT w.data FROM workspaces w JOIN users u ON u.id=w.user_id LIMIT 1').get();return row?JSON.parse(row.data):null;},
 backup:destination=>db.prepare('VACUUM INTO ?').run(destination),
 close:async()=>{await cloudSync?.close();return new Promise(resolve=>{clearInterval(cleanupTimer);server.close(()=>{db.close();resolve();});server.closeAllConnections();});}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const service=await startServer();console.log('拾序服务已启动');
 process.on('SIGTERM',()=>service.close().then(()=>process.exit(0)));
}
