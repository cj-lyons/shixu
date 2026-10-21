export const FLOWER_MESSAGES_CACHE='shixu-flower-messages-v1';
export const FLOWER_CONTENT_CHANGED='shixu-flower-content-changed-v1';
export const defaultMessages=[
 '对当下保留温度，对未来减少预设，对自己的人生始终保有主动权。',
 '你不需要做完所有事，先做当下重要的那件。',
 '认真推进，也允许自己在事情尚未结束时休息。',
 '把下一步记下来，就可以安心停在这里。',
 '把温柔留给今天，也给自己留一点空间。',
];
export function readMessages(){try{const saved=JSON.parse(localStorage.getItem(FLOWER_MESSAGES_CACHE)||'null');if(Array.isArray(saved)){const list=saved.filter((v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=200).slice(0,50);if(list.length)return [...new Set(list)];}}catch{}return defaultMessages;}
export type FlowerMessage={id:string;text:string;enabled:boolean;createdAt:string;updatedAt:string};
export type FlowerContent={initialized:boolean;revision:number;messages:FlowerMessage[]};
export async function contentRequest(route='',method='GET',body?:unknown):Promise<FlowerContent>{const response=await fetch('/api/content/flower-messages'+route,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'内容后台暂时不可用，请重启更新后的拾序。'),{status:response.status});return result;}
export async function loadFlowerContent(){const result=await contentRequest();return result.initialized?result:contentRequest('/bootstrap','POST',{messages:readMessages()});}
export function announceFlowerContent(){try{localStorage.setItem(FLOWER_CONTENT_CHANGED,Date.now()+'-'+Math.random());}catch{}window.dispatchEvent(new Event(FLOWER_CONTENT_CHANGED));}
