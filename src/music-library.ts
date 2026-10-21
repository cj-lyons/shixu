export type Energy='low'|'medium'|'high';
export const energyNames:Record<Energy,string>={low:'轻松一点',medium:'状态平稳',high:'精力充沛'};
export const energyModes:Energy[]=['low','medium','high'];
export type SavedTrack={id:Energy;name:string;blob:Blob};
function openLibrary():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('shixu-local-music-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function readTracks():Promise<SavedTrack[]>{const db=await openLibrary();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readonly'),request=tx.objectStore('tracks').getAll();tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export async function saveTrack(id:Energy,file:File|null){const db=await openLibrary();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');if(file)tx.objectStore('tracks').put({id,name:file.name,blob:file});else tx.objectStore('tracks').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
