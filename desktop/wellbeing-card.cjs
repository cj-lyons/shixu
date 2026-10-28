const path=require('node:path');
const {pathToFileURL}=require('node:url');
function createWellbeingCard({BrowserWindow,screen,ipcMain,appearance,act,onShown=()=>{}}){
 let card=null,current=null,expiry=null,sequence=0;
 const url=pathToFileURL(path.join(__dirname,'wellbeing-card.html')).href;
 const trusted=event=>card&&!card.isDestroyed()&&event.sender===card.webContents&&event.senderFrame?.url===url;
 const destroy=()=>{clearTimeout(expiry);expiry=null;current=null;if(card&&!card.isDestroyed())card.close();};
 const close=()=>{sequence++;destroy();};
 ipcMain.on('shixu:wellbeing-card-ready',event=>{if(trusted(event)&&current){card.webContents.send('shixu:wellbeing-card-content',current);card.showInactive();onShown(current.id);}});
 ipcMain.handle('shixu:wellbeing-card-act',async(event,id,action)=>{if(!trusted(event)||!current||id!==current.id||!['done','snooze','dismiss'].includes(action))throw Error('提醒已更新，请使用当前卡片');const keys=current.keys;if(action!=='dismiss')for(const key of keys)act(key,action);close();});
 return {close,sync(state){if(state.meetingUntil||!state.notificationsEnabled||!state.config.floralCard||current?.keys.some(key=>!state.config[key].enabled)||current?.keys.length===1&&current.keys[0]==='move'&&state.naturalIdle)close();},async show(message){
   const request=++sequence;const theme=await appearance().catch(()=> 'sakura');if(request!==sequence)return false;
   destroy();current={id:message.key,theme,body:message.body,keys:message.wellbeingKeys};
   const {workArea}=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
   card=new BrowserWindow({width:440,height:280,x:workArea.x+workArea.width-456,y:workArea.y+workArea.height-296,frame:false,resizable:false,show:false,skipTaskbar:true,alwaysOnTop:true,title:'拾序 · 花语提醒',backgroundColor:'#fff8fa',webPreferences:{preload:path.join(__dirname,'wellbeing-card-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,devTools:false}});
   const created=card;created.setMenu(null);created.webContents.setWindowOpenHandler(()=>({action:'deny'}));created.webContents.on('will-navigate',event=>event.preventDefault());created.webContents.on('will-attach-webview',event=>event.preventDefault());created.on('closed',()=>{if(card===created){card=null;current=null;clearTimeout(expiry);}});
   try{await created.loadURL(url);}catch(error){if(request!==sequence||card!==created)return false;close();throw error;}
   if(card!==created||request!==sequence)return false;
   expiry=setTimeout(close,60000);expiry.unref();return true;
 }};
}
module.exports={createWellbeingCard};
