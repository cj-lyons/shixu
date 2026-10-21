import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const logs=path.join(process.env.APPDATA,'ShixuDevelopment');mkdirSync(logs,{recursive:true});
const log=path.join(logs,'launcher.log'),fd=openSync(log,'w');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
try{
 for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['scripts/prepare-flower-themes.mjs'],['scripts/prepare-music.mjs'],['node_modules/vite/bin/vite.js','build'],['desktop/build.mjs','--dev']]){
  const r=spawnSync(process.execPath,args,{cwd:root,env,stdio:['ignore',fd,fd],windowsHide:true});if(r.status!==0)throw Error('Build step failed: '+args[0]);
 }
 const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[path.join(root,'desktop/dev-app'),'--shixu-dev'],{cwd:root,env,detached:true,stdio:'ignore',windowsHide:true});
 child.on('error',error=>{appendFileSync(log,'\n'+error.stack);process.exitCode=1;});child.unref();
}catch(error){appendFileSync(log,'\n'+error.stack);process.exitCode=1;}finally{closeSync(fd);}
