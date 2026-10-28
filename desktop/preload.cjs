const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('shixuDesktop', {
  openContentAdmin:()=>ipcRenderer.invoke('shixu:open-content-admin'),
  chooseMusicDirectory: ()=>ipcRenderer.invoke('shixu:choose-music-directory'),
  getReminderState: () => ipcRenderer.invoke('shixu:reminders-state'),
  enableReminders: () => ipcRenderer.invoke('shixu:reminders-enable'),
  getWellbeing:()=>ipcRenderer.invoke('shixu:wellbeing-state'),
  configureWellbeing:value=>ipcRenderer.invoke('shixu:wellbeing-configure',value),
  actWellbeing:(key,action)=>ipcRenderer.invoke('shixu:wellbeing-act',key,action),
  testWellbeing:()=>ipcRenderer.invoke('shixu:wellbeing-test'),
  pauseWellbeing:minutes=>ipcRenderer.invoke('shixu:wellbeing-pause',minutes),
  reportMusicState: value=>ipcRenderer.invoke('shixu:music-state',value),
  onMusicCommand: callback=>{const listener=(_event,command)=>callback(command);ipcRenderer.on('shixu:music-command',listener);return()=>ipcRenderer.removeListener('shixu:music-command',listener);},
  onReminderState: callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('shixu:reminders-updated',listener);return()=>ipcRenderer.removeListener('shixu:reminders-updated',listener);},
  syncTimer: timer => ipcRenderer.invoke('shixu:timer-sync', timer),
  onTimerCommand: callback=>{const listener=()=>callback();ipcRenderer.on('shixu:timer-command',listener);return()=>ipcRenderer.removeListener('shixu:timer-command',listener);},
  onTimer: callback => { const listener = (_event, timer) => callback(timer); ipcRenderer.on('shixu:timer-updated', listener); return () => ipcRenderer.removeListener('shixu:timer-updated', listener); }
});
