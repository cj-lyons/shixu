import { randomUUID } from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createFlowerContent(db){
 db.exec(`CREATE TABLE IF NOT EXISTS flower_content_settings(user_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS flower_messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,text TEXT NOT NULL,enabled INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,text));`);
 function read(user,admin=true){const config=db.prepare('SELECT revision FROM flower_content_settings WHERE user_id=?').get(user),rows=db.prepare('SELECT id,text,enabled,created_at,updated_at FROM flower_messages WHERE user_id=? ORDER BY created_at,id').all(user);return {initialized:!!config,revision:config?.revision||0,messages:rows.filter(r=>admin||r.enabled).map(r=>({id:r.id,text:r.text,enabled:!!r.enabled,createdAt:r.created_at,updatedAt:r.updated_at}))};}
 function text(value){if(typeof value!=='string'||!value.trim()||value.trim().length>200)fail('请填写 1—200 字的寄语。');return value.trim();}
 function bootstrap(user,body){
  if(!Array.isArray(body?.messages)||!body.messages.length||body.messages.length>50)fail('初始寄语需要 1—50 句。');const values=[...new Set(body.messages.map(text))];
  db.exec('BEGIN IMMEDIATE');try{const result=db.prepare('INSERT OR IGNORE INTO flower_content_settings(user_id) VALUES(?)').run(user);if(result.changes){const now=new Date().toISOString(),insert=db.prepare('INSERT INTO flower_messages VALUES(?,?,?,?,?,?)');for(const value of values)insert.run(randomUUID(),user,value,1,now,now);}db.exec('COMMIT');return read(user);}catch(e){db.exec('ROLLBACK');throw e;}
 }
 function mutate(user,method,id,body){
  if(!body||!Number.isSafeInteger(body.revision)||body.revision<0)fail('请先刷新内容列表。');
  const value=method==='DELETE'?null:text(body.text);if(method!=='DELETE'&&typeof body.enabled!=='boolean')fail('请选择是否启用。');
  db.exec('BEGIN IMMEDIATE');try{
   const state=read(user);if(!state.initialized)fail('内容库尚未初始化。');if(state.revision!==body.revision)fail('内容已经发生变化，请刷新后再保存。当前输入可以保留。',409);
   const old=id?state.messages.find(m=>m.id===id):null;if(id&&!old)fail('这条寄语已不存在。',404);
   if(method==='POST'&&state.messages.length>=50)fail('最多保存 50 句，可先删除不再使用的句子。');
   if(value&&state.messages.some(m=>m.text===value&&m.id!==id))fail('这句话已经在内容库中。');
   if(old?.enabled&&(method==='DELETE'||!body.enabled)&&state.messages.filter(m=>m.enabled).length<=1)fail('请至少保留一句启用的寄语，可先添加新的句子。');
   const now=new Date().toISOString();
   if(method==='POST')db.prepare('INSERT INTO flower_messages VALUES(?,?,?,?,?,?)').run(randomUUID(),user,value,body.enabled?1:0,now,now);
   else if(method==='PUT')db.prepare('UPDATE flower_messages SET text=?,enabled=?,updated_at=? WHERE id=? AND user_id=?').run(value,body.enabled?1:0,now,id,user);
   else db.prepare('DELETE FROM flower_messages WHERE id=? AND user_id=?').run(id,user);
   db.prepare('UPDATE flower_content_settings SET revision=revision+1 WHERE user_id=?').run(user);db.exec('COMMIT');return read(user);
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {read,bootstrap,mutate};
}
