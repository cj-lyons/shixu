import {cp,mkdir,readFile,stat,copyFile,writeFile,access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function prepareDevelopmentRuntime(){
 const source=path.join(root,'node_modules/electron/dist');
 if(process.platform!=='win32')return path.join(source,process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron');
 const version=JSON.parse(await readFile(path.join(root,'node_modules/electron/package.json'),'utf8')).version;
 const icon=path.join(root,'desktop/dev-magnolia.ico'),hash=createHash('sha256').update(await readFile(icon)).digest('hex');
 const folder=path.join(root,'desktop/dev-runtime',version),ready=path.join(folder,'runtime-ready.json');
 let prepared=false;try{const marker=JSON.parse(await readFile(ready,'utf8'));prepared=marker.version===version&&marker.source===source;await access(path.join(folder,'electron.exe'));}catch{prepared=false;}
 if(!prepared){await mkdir(folder,{recursive:true});await cp(source,folder,{recursive:true});await writeFile(ready,JSON.stringify({version,source}));}
 // A distinct executable preserves the shared Electron runtime and avoids its cached shell icon.
 const executable=path.join(folder,'ShixuDevelopment-'+hash.slice(0,10)+'.exe');
 try{if((await stat(executable)).size>1000000)return executable;}catch{}
 const temporary=executable+'.preparing.exe';await copyFile(path.join(folder,'electron.exe'),temporary);
 const editor=path.join(root,'node_modules/electron-winstaller/vendor/rcedit.exe');
 const result=spawnSync(editor,[temporary,'--set-icon',icon,'--set-version-string','ProductName','拾序·开发版','--set-version-string','FileDescription','拾序·开发版 · 玉兰白'],{windowsHide:true,encoding:'utf8'});
 if(result.error||result.status!==0)throw Error('开发版图标准备失败：'+(result.error?.message||result.stderr||'请先退出开发版后重试'));
 const {rename}=await import('node:fs/promises');await rename(temporary,executable);return executable;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await prepareDevelopmentRuntime());
