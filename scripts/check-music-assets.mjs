import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundledTracks } from '../src/bundled-music.ts';

// Private listening files never become distributable merely by being copied into public/audio.
export function checkMusicAssets(directory){
 if(!existsSync(directory))return;
 const manifest=new URL('../music/养心曲-版权清单.json',import.meta.url);
 const blocked=existsSync(manifest)?new Set(JSON.parse(readFileSync(manifest,'utf8')).tracks.map(t=>t.sha256)):new Set();
 const allowed=new Set(bundledTracks.map(t=>t.file));
 function visit(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){
  const full=path.join(folder,entry.name);
  if(entry.isSymbolicLink())throw Error('音乐资源不允许使用链接：'+entry.name);
  if(entry.isDirectory()){visit(full);continue;}
  if(!/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(entry.name))continue;
  if(!allowed.has(path.relative(directory,full)))throw Error('发现未批准打包的音乐：'+path.relative(directory,full)+'。个人曲库请保留在本机。');
  const hash=createHash('sha256').update(readFileSync(full)).digest('hex');
  if(blocked.has(hash))throw Error('版权待核实的个人曲库音频不能打包：'+entry.name);
 }}
 visit(directory);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 checkMusicAssets(path.resolve('public/audio'));checkMusicAssets(path.resolve('dist/audio'));
 console.log('Music distribution check passed: private library excluded.');
}
