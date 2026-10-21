import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import Workspace from './workspace';
import ContentAdmin from './content-admin';
import './style.css';
import { ThemeProvider, ThemeSwitcher, ThemeFlower } from './themes';
import './themes.css';
import './flower-palettes.css';
import './flower-gallery.css';
import './workspace-layout.css';
function App(){
 const [user,setUser]=useState<{id:string,username:string,desktop?:boolean}|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [username,setUsername]=useState(''),[password,setPassword]=useState('');
 useEffect(()=>{fetch('/api/me').then(async r=>{if(r.ok)setUser(await r.json());else if(r.status!==401)throw Error();}).catch(()=>setError('连接失败，请刷新重试')).finally(()=>setLoading(false));},[]);
 async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const body=await r.json();if(!r.ok)throw Error(body.error||'登录失败');setPassword('');setUser(body);}catch(e){setError(e instanceof Error?e.message:'无法连接，请稍后重试');}finally{setBusy(false);}}
 useEffect(()=>{if(user)window.dispatchEvent(new Event('shixu-user-ready'));},[user?.id]);
 if(loading)return <main className="signin"><div className="brandmark">拾</div><p>正在打开你的工作台…</p></main>;
 if(user&&location.pathname==='/admin')return <ContentAdmin desktop={!!user.desktop}/>;
 if(user)return <Workspace storageScope={user.id} desktop={user.desktop}/>;
 return <main className="signin"><ThemeSwitcher floating/><ThemeFlower className="signin-flower"/><div className="brandmark">拾</div><h1>拾序</h1><p>把事情放下来，把精力留给重要的事。</p><form className="login-form" onSubmit={login}><label>账号<input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)}/></label><label>密码<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?'正在登录…':'登录我的工作台 →'}</button></form><small>独立部署 · 数据保存在你自己的服务器</small></main>;
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><App/></ThemeProvider>);
