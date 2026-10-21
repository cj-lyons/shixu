import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
export async function serveAudio(req,res,target,json){
 const types={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.flac':'audio/flac','.webm':'audio/webm'};
 const size=(await stat(target)).size,headers={'Content-Type':types[path.extname(target).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
 let start=0,end=size-1,status=200;
 if(req.headers.range&&req.method==='GET'){
  const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!match||(!match[1]&&!match[2]))return json(res,416,{error:'播放位置无效'},{'Content-Range':`bytes */${size}`});
  if(!match[1]){const suffix=Number(match[2]);start=Math.max(0,size-suffix);if(suffix<=0)start=size;}
  else{start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),size-1);}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return json(res,416,{error:'播放位置无效'},{'Content-Range':`bytes */${size}`});
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 }
 headers['Content-Length']=end-start+1;res.writeHead(status,headers);
 if(req.method==='HEAD')return res.end();
 const stream=createReadStream(target,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
