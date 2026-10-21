import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { themes, seasons, isTheme, seasonLabel, type Theme } from './flower-catalog';
import FlowerArt from './flower-art';
import { FLOWER_MESSAGES_CACHE, FLOWER_CONTENT_CHANGED, readMessages, loadFlowerContent } from './flower-message-library';
export { themes } from './flower-catalog';
const key='shixu-theme-v1';
const noteKey='shixu-flower-note-v1';
const lastMessageKey='shixu-flower-last-message-v1';
function pickMessage(messages:string[],previous=''){const candidates=messages.filter(v=>v!==previous);const pool=candidates.length?candidates:messages;return pool[Math.floor(Math.random()*pool.length)]||readMessages()[0];}
type NoteMode='flower'|'random';
type ThemeContextValue={theme:Theme;setTheme:(value:Theme)=>void;noteMode:NoteMode;setNoteMode:(value:NoteMode)=>void;messages:string[];message:string;nextMessage:()=>void};
const ThemeContext=createContext<ThemeContextValue>({theme:'sakura',setTheme:()=>{},noteMode:'random',setNoteMode:()=>{},messages:readMessages(),message:readMessages()[0],nextMessage:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}){
 const [theme,setTheme]=useState<Theme>(()=>{try{const saved=localStorage.getItem(key);return isTheme(saved)?saved:'sakura';}catch{return 'sakura';}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themes.find(t=>t.id===theme)!.color);try{localStorage.setItem(key,theme);}catch{}},[theme]);
 const [noteMode,setNoteMode]=useState<NoteMode>(()=>{try{return localStorage.getItem(noteKey)==='flower'?'flower':'random';}catch{return 'random';}});
 useEffect(()=>{try{localStorage.setItem(noteKey,noteMode);}catch{}},[noteMode]);
 const [messages,setMessages]=useState(readMessages);
 const [message,setMessage]=useState(()=>{try{return pickMessage(messages,localStorage.getItem(lastMessageKey)||'');}catch{return pickMessage(messages);}});
 const messageList=useRef(messages);
 useEffect(()=>{let active=true,sequence=0;const refresh=async()=>{const request=++sequence;try{const data=await loadFlowerContent();if(!active||request!==sequence)return;const next=data.messages.filter(m=>m.enabled).map(m=>m.text);if(next.length&&JSON.stringify(next)!==JSON.stringify(messageList.current)){messageList.current=next;setMessages(next);setMessage(old=>pickMessage(next,old));try{localStorage.setItem(FLOWER_MESSAGES_CACHE,JSON.stringify(next));}catch{}}}catch{}};const onStorage=(e:StorageEvent)=>{if(e.key===FLOWER_CONTENT_CHANGED)void refresh();if(e.key===noteKey)setNoteMode(e.newValue==='flower'?'flower':'random');};window.addEventListener('shixu-user-ready',refresh);window.addEventListener(FLOWER_CONTENT_CHANGED,refresh);window.addEventListener('storage',onStorage);window.addEventListener('focus',refresh);void refresh();return()=>{active=false;window.removeEventListener('shixu-user-ready',refresh);window.removeEventListener(FLOWER_CONTENT_CHANGED,refresh);window.removeEventListener('storage',onStorage);window.removeEventListener('focus',refresh);};},[]);
 const previousTheme=useRef(theme);
 useEffect(()=>{if(previousTheme.current===theme)return;previousTheme.current=theme;if(noteMode==='random')setMessage(old=>pickMessage(messages,old));},[theme,noteMode,messages]);
 useEffect(()=>{try{localStorage.setItem(lastMessageKey,message);}catch{}},[message]);
 const value=useMemo(()=>({theme,setTheme,noteMode,setNoteMode,messages,message,nextMessage:()=>setMessage(old=>pickMessage(messages,old))}),[theme,noteMode,messages,message]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function ThemeFlower({className='',themeId}:{className?:string;themeId?:Theme}){
 const {theme}=useContext(ThemeContext);
 return <FlowerArt theme={themes.find(t=>t.id===(themeId??theme))!} className={className}/>;
}
export function FlowerNote({previewText}:{previewText?:string}={}){
 const {theme,noteMode,message,messages,nextMessage}=useContext(ThemeContext),active=themes.find(t=>t.id===theme)!;
 return <section className="featured-flower" aria-label="当前花语"><div className="flower-note-copy"><span className="flower-kicker">{seasonLabel(active.season)}日花笺 · {active.flowerName}</span><h2>{active.meaning}</h2><p className={noteMode==='random'?'personal-flower-note':undefined}>{previewText??(noteMode==='random'?message:active.subtitle)}</p><div className="flower-note-meta"><i style={{background:active.color}} aria-hidden="true"/><small>{active.colorName} · 花语意象</small>{previewText===undefined&&noteMode==='random'&&messages.length>1?<button type="button" className="flower-note-next" aria-label="换一句寄语" onClick={nextMessage}>换一句</button>:<span>IN BLOOM</span>}</div></div><div className="flower-note-art" aria-hidden="true"><ThemeFlower/></div></section>;
}
export function ThemeSwitcher({floating=false}:{floating?:boolean}){
 const {theme,setTheme,noteMode,setNoteMode}=useContext(ThemeContext),active=themes.find(t=>t.id===theme)!;
 const [season,setSeason]=useState<typeof seasons[number]['id']>('all'),[query,setQuery]=useState('');
 const element=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(element.current?.open&&!element.current.contains(e.target as Node))element.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 const close=()=>{if(element.current){element.current.open=false;element.current.querySelector('summary')?.focus();}};
 const search=query.trim().toLocaleLowerCase();
 const filtered=themes.filter(t=>(season==='all'||t.season===season)&&`${t.label} ${t.flowerName} ${t.colorName} ${t.meaning}`.toLocaleLowerCase().includes(search));
 return <details ref={element} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}}} className={'theme-picker '+(floating?'floating':'')}><summary aria-label={'更换界面，当前为'+active.label}><ThemeFlower/><span>{active.label}</span><ChevronDown size={12}/></summary><div className="flower-gallery" role="group" aria-label="界面主题"><div className="flower-gallery-heading"><div><b>四季花语</b><p>16 种花开，陪你慢慢向前</p></div><button type="button" aria-label="关闭花卉主题" onClick={close}><X size={18}/></button></div><label className="flower-search"><Search size={16}/><input aria-label="搜索花卉、颜色或花语" placeholder="搜索花名、颜色、花语…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="清空搜索" onClick={()=>setQuery('')}><X size={14}/></button>}</label><div className="flower-seasons" role="group" aria-label="按季节筛选">{seasons.map(s=><button type="button" key={s.id} aria-pressed={s.id===season} onClick={()=>setSeason(s.id)}>{s.label}</button>)}<span>{filtered.length} 种花</span></div><div className="flower-grid">{filtered.map(t=><button className="flower-choice" type="button" key={t.id} aria-label={`${t.label}，${t.colorName}，${t.meaning}`} aria-pressed={t.id===theme} onClick={()=>{setTheme(t.id);close();}}><div className="flower-preview" style={{background:`linear-gradient(145deg,${t.petalLight},${t.petal}38)`}}><ThemeFlower themeId={t.id}/>{t.id===theme&&<Check size={15}/>}</div><b>{t.label}{t.id==='sakura'&&<small>默认</small>}</b><span>{seasonLabel(t.season)} · {t.colorName}</span><em>{t.meaning}</em></button>)}{filtered.length===0&&<div className="flower-no-results"><p>暂时没有找到这朵花</p><button type="button" onClick={()=>{setQuery('');setSeason('all');}}>查看全部花卉</button></div>}</div><div className="flower-gallery-footer"><label className="flower-note-select">花笺寄语<select aria-label="花笺寄语" value={noteMode} onChange={e=>setNoteMode(e.target.value as NoteMode)}><option value="random">随机寄语 · 我的句子</option><option value="flower">随花更换寄语</option></select></label>本设备记住选择 · 樱花为默认主题<br/><small>花语为本应用选用的文化意象；花期因地区与品种而异。</small></div></div></details>;
}

export function useThemeSettings(){return useContext(ThemeContext);}
