const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('shixuCard',{
  ready:()=>ipcRenderer.send('shixu:custom-card-ready'),
  onUpdate:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('shixu:custom-card-content',listener);return()=>ipcRenderer.removeListener('shixu:custom-card-content',listener);},
  act:(id,action)=>ipcRenderer.invoke('shixu:custom-card-act',id,action)
});
