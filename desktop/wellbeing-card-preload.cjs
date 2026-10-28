const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('shixuCard',{
  ready:()=>ipcRenderer.send('shixu:wellbeing-card-ready'),
  onUpdate:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('shixu:wellbeing-card-content',listener);return()=>ipcRenderer.removeListener('shixu:wellbeing-card-content',listener);},
  act:(id,action)=>ipcRenderer.invoke('shixu:wellbeing-card-act',id,action)
});
