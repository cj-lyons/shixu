import { readdir, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
export async function personalLibrary(directory){
 if(!directory)return {name:'本机曲库',tracks:[],files:new Map(),configured:false};
 try{
  const root=await realpath(directory),entries=await readdir(root,{withFileTypes:true}),tracks=[],files=new Map();
  for(const entry of entries){
   if(!entry.isFile()||! /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(entry.name))continue;
   const file=path.join(root,entry.name),info=await stat(file);
   const id=createHash('sha256').update(root+'\0'+entry.name).digest('hex');files.set(id,file);
   tracks.push({id,name:entry.name.replace(/\.[^.]+$/,''),bytes:info.size,rightsStatus:'unverified'});
  }
  tracks.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  return {name:path.basename(root),tracks,files,configured:true};
 }catch{return {name:'本机曲库',tracks:[],files:new Map(),configured:true,error:'曲库文件夹暂不可用，请重新选择。'};}
}
