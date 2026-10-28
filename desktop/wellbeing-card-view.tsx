import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import FlowerArt from '../src/flower-art';
import {themes,paletteFor} from '../src/flower-catalog';
type Content={id:string;theme:string;body:string;keys:('move'|'water')[]};
declare global {interface Window {shixuCard:{ready:()=>void;onUpdate:(callback:(value:Content)=>void)=>()=>void;act:(id:string,action:'done'|'snooze'|'dismiss')=>Promise<void>}}}
function Card(){
 const [content,setContent]=useState<Content|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const off=window.shixuCard.onUpdate(value=>{setContent(value);setBusy(false);setError('');});window.shixuCard.ready();return off;},[]);
 if(!content)return null;
 const theme=themes.find(t=>t.id===content.theme)??themes[0],waterOnly=content.keys.length===1&&content.keys[0]==='water';
 async function act(action:'done'|'snooze'|'dismiss'){if(busy||!content)return;setBusy(true);try{await window.shixuCard.act(content.id,action);}catch{setError('未能保存，请再试一次');setBusy(false);}}
 return <main style={paletteFor(theme)}><header><span>拾序 · 花语小憩</span><button aria-label="关闭提醒" disabled={busy} onClick={()=>void act('dismiss')}>×</button></header><div className="card-body"><div className="card-copy"><small>{theme.flowerName} · {theme.meaning}</small><h1>{waterOnly?'喝点水，慢慢来':'起身，让思绪透透气'}</h1><p>{content.body}</p></div><FlowerArt theme={theme}/></div><footer><span>{theme.subtitle}</span><div><button className="later" disabled={busy} onClick={()=>void act('snooze')}>稍后10分钟</button><button className="done" disabled={busy} onClick={()=>void act('done')}>{waterOnly?'我已喝水':content.keys.length===2?'已活动，也喝了水':'我已活动'}</button></div></footer>{error&&<small role="alert">{error}</small>}</main>;
}
createRoot(document.getElementById('root')!).render(<Card/>);
