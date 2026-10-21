import { cp, mkdir, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { checkMusicAssets } from './check-music-assets.mjs';
import { fileURLToPath } from 'node:url';
const files=[['樱花1.mp3','sakura-1.mp3'],['蓝色矢车菊1.mp3','cornflower-1.mp3'],['蓝色矢车菊2.mp3','cornflower-2.mp3'],['向日葵1.mp3','sunflower-1.mp3']];
const target=new URL('../public/audio/',import.meta.url);await mkdir(target,{recursive:true});
let prepared=0;
for(const [source,dest] of files){const from=new URL('../music/'+source,import.meta.url),to=new URL(dest,target);try{await access(from);}catch(error){if(error.code!=='ENOENT')throw error;console.log('Optional local music not included: '+source);continue;}await cp(from,to);const hash=b=>createHash('sha256').update(b).digest('hex');if(hash(await readFile(from))!==hash(await readFile(to)))throw Error('Music copy mismatch: '+source);prepared++;}
checkMusicAssets(fileURLToPath(target));
console.log(`Prepared ${prepared} flower music tracks; private library excluded.`);
