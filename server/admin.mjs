import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const dir=process.env.DATA_DIR||path.resolve('data'),db=new DatabaseSync(path.join(dir,'shixu.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
if(process.argv[2]==='backup'){
 const backups=path.join(dir,'backups');mkdirSync(backups,{recursive:true});const destination=path.join(backups,`shixu-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
 db.prepare('VACUUM INTO ?').run(destination);console.log('备份完成：'+destination);
}else if(process.argv[2]==='reset-password'){
 const username=process.env.BOOTSTRAP_USERNAME,password=process.env.BOOTSTRAP_PASSWORD;
 if(!username||!password||password.length<12)throw Error('请先在 .env 中设置账号和至少12位新密码，再重建应用容器');
 const user=db.prepare('SELECT id FROM users WHERE username=?').get(username);if(!user)throw Error('账号不存在');
 const salt=randomBytes(24).toString('hex');db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);console.log('密码已更新，旧登录已退出。');
}else throw Error('请选择 backup 或 reset-password');
db.close();
