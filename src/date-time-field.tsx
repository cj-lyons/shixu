import { useId, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { localDay } from './model';
import './date-time-field.css';

// Preview valid selections in the draft; cancel restores the value from when the picker opened.
export default function DateTimeField({label,value,onChange}:{label:string,value:string,onChange:(value:string)=>void}){
  const id=useId(),[open,setOpen]=useState(false),[initialValue,setInitialValue]=useState(value),[date,setDate]=useState(''),[time,setTime]=useState('09:00'),[month,setMonth]=useState(()=>new Date());
  const valid=!!date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  function begin(){setInitialValue(value);const parsed=value?new Date(value):new Date();const initial=Number.isFinite(parsed.getTime())?parsed:new Date();setDate(localDay(initial));setTime(value?`${String(initial.getHours()).padStart(2,'0')}:${String(initial.getMinutes()).padStart(2,'0')}`:'09:00');setMonth(new Date(initial.getFullYear(),initial.getMonth(),1));setOpen(true);}
  function confirm(day=date){if(day&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){onChange(day+'T'+time);setOpen(false);}}
  const year=month.getFullYear(),m=month.getMonth(),offset=(new Date(year,m,1).getDay()+6)%7,days=new Date(year,m+1,0).getDate();
  return <div className="date-time-field"><span id={id}>{label}</span><button type="button" className="date-time-trigger" aria-labelledby={id} aria-expanded={open} onClick={()=>open?setOpen(false):begin()}><span>{value?new Date(value).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'选择日期和时间'}</span><CalendarDays size={16}/></button>
    {open&&<div className="date-time-picker" role="group" aria-label={label+'选择器'} onKeyDown={e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onChange(initialValue);setOpen(false);}
      if(e.key==='Enter'&&valid&&(e.ctrlKey||e.metaKey||e.target instanceof HTMLInputElement)){e.preventDefault();e.stopPropagation();const form=e.currentTarget.closest('form');confirm();if(e.ctrlKey||e.metaKey)requestAnimationFrame(()=>form?.requestSubmit());}
    }}><div className="date-month"><button type="button" aria-label={label+'上个月'} onClick={()=>setMonth(new Date(year,m-1,1))}><ChevronLeft size={16}/></button><b>{year}年{m+1}月</b><button type="button" aria-label={label+'下个月'} onClick={()=>setMonth(new Date(year,m+1,1))}><ChevronRight size={16}/></button></div><div className="date-calendar">{['一','二','三','四','五','六','日'].map(d=><small key={d}>{d}</small>)}{Array.from({length:offset},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:days},(_,i)=>{const n=i+1,day=localDay(new Date(year,m,n));return <button type="button" key={day} aria-label={`${year}年${m+1}月${n}日`} aria-pressed={date===day} className={date===day?'chosen':''} onClick={()=>{setDate(day);if(/^([01]\d|2[0-3]):[0-5]\d$/.test(time))onChange(day+'T'+time);}} onDoubleClick={()=>confirm(day)}>{n}</button>;})}</div><label className="date-clock">时间<input aria-label={label+'的时间'} type="time" required value={time} onChange={e=>{const next=e.target.value;setTime(next);if(date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(next))onChange(date+'T'+next);}}/></label><small className="date-hint">单击选日期，再点确定；双击日期可直接确定。</small><div className="date-picker-actions"><button type="button" className="text-button" onClick={()=>{onChange('');setOpen(false);}}>清除</button><span/><button type="button" className="text-button" onClick={()=>{onChange(initialValue);setOpen(false);}}>取消</button><button type="button" className="primary" disabled={!valid} onClick={()=>confirm()}>确定</button></div></div>}
  </div>;
}
