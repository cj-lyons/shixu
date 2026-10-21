const { app, BrowserWindow, Menu, dialog, session, shell, Tray, Notification, ipcMain, nativeImage, safeStorage } = require('electron');
const { createReminders } = require('./reminders.cjs');
const { createTrayControls } = require('./tray-controls.cjs');
const musicCatalog = require('./music-catalog.json');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

const devMode = process.argv.includes('--shixu-dev');
const appName = devMode ? '拾序·开发版' : '拾序';
app.setName(appName);
const profileArg = process.argv.find(value => value.startsWith('--shixu-profile='));
const appId = profileArg ? 'cn.shixu.focus.qa.' + require('node:crypto').createHash('sha256').update(profileArg).digest('hex').slice(0,12) : devMode ? 'cn.shixu.focus.development' : 'cn.shixu.focus.desktop';
app.setAppUserModelId(appId);
if (profileArg) app.setPath('userData', path.resolve(profileArg.slice('--shixu-profile='.length)));
else app.setPath('userData', path.join(app.getPath('appData'), devMode ? 'ShixuDevelopment' : 'ShixuDesktop'));
const portArg = process.argv.find(value => value.startsWith('--shixu-port='));
const port = portArg ? Number(portArg.split('=')[1]) : devMode ? 18750 : 18736;
let window, adminWindow, service, tray, reminders, trayControls, showWorkspace, quitting = false, closingService = false;
const notifications = new Set();
let musicState={ready:false,playing:false,title:'',id:null,automatic:true};
const publishTimer=timer=>{if(window&&!window.isDestroyed())window.webContents.send('shixu:timer-updated',timer);trayControls?.refresh();};
const publishReminder=state=>{if(window&&!window.isDestroyed())window.webContents.send('shixu:reminders-updated',state);};
const dataDir = path.join(app.getPath('userData'), 'data');
const libraryConfig=path.join(app.getPath('userData'),'personal-music.json');
let musicDirectory='';
try{const saved=JSON.parse(fs.readFileSync(libraryConfig,'utf8'));if(typeof saved.directory==='string')musicDirectory=saved.directory;}catch{}
if(!musicDirectory&&devMode){const candidate=path.resolve(__dirname,'../../music/养心曲');if(fs.existsSync(candidate))musicDirectory=candidate;}

const iconPath = app.isPackaged ? path.join(process.resourcesPath, 'shixu.ico') : path.join(__dirname, 'icon.ico');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => showWorkspace?.());
  app.on('activate', () => showWorkspace?.());
  app.whenReady().then(async () => {
    try {
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('本机端口设置无效');
      const { startServer } = await import(pathToFileURL(path.join(__dirname, 'server.mjs')).href);
      service = await startServer({ root: __dirname, dataDir, desktop: true, host: '127.0.0.1', port, getMusicDirectory: ()=>musicDirectory, syncSecrets: safeStorage.isEncryptionAvailable() ? { encrypt: value=>safeStorage.encryptString(value).toString('base64'), decrypt: value=>safeStorage.decryptString(Buffer.from(value,'base64')) } : undefined });
      const localSession = session.fromPartition('persist:shixu');
      await localSession.cookies.set({ url: service.url, name: 'shixu_session', value: service.token, httpOnly: true, sameSite: 'lax', path: '/' });
      const trusted = url => { try { return new URL(url).origin === service.url; } catch { return false; } };
      localSession.setPermissionRequestHandler((contents, permission, callback) => callback(permission === 'notifications' && trusted(contents.getURL())));
      localSession.setPermissionCheckHandler((contents, permission, origin) => permission === 'notifications' && !!contents && trusted(origin));
      localSession.webRequest.onHeadersReceived({ urls: [service.url + '/*'] }, (details, callback) => callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"] } }));
      const showContentAdmin=()=>{
        if(adminWindow&&!adminWindow.isDestroyed()){if(adminWindow.isMinimized())adminWindow.restore();adminWindow.show();adminWindow.focus();return;}
        adminWindow=new BrowserWindow({width:1240,height:880,minWidth:800,minHeight:600,title:appName+' · 内容后台',backgroundColor:'#fff8fa',icon:nativeImage.createFromPath(iconPath),show:false,webPreferences:{session:localSession,nodeIntegration:false,contextIsolation:true,sandbox:true,webviewTag:false,devTools:!app.isPackaged||!!profileArg}});
        adminWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));adminWindow.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});adminWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
        if(process.platform==='win32')adminWindow.setAppDetails({appId,appIconPath:iconPath,appIconIndex:0,relaunchDisplayName:appName});
        adminWindow.on('page-title-updated',event=>event.preventDefault());adminWindow.once('ready-to-show',()=>adminWindow.show());adminWindow.on('closed',()=>{adminWindow=null;});void adminWindow.loadURL(service.url+'/admin');
      };
      showWorkspace = () => {
        if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); return; }
        window = new BrowserWindow({ width: 1400, height: 940, minWidth: 900, minHeight: 650, title: devMode ? '拾序·开发版 · 独立测试数据' : '拾序 · 任务与精力管理', backgroundColor: '#fff8fa', icon: nativeImage.createFromPath(iconPath), show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), session: localSession, nodeIntegration: false, contextIsolation: true, sandbox: true, webviewTag: false, backgroundThrottling: false, devTools: !app.isPackaged || !!profileArg } });
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
      window.webContents.on('will-attach-webview', event => event.preventDefault());
      if (process.platform === 'win32') window.setAppDetails({ appId, appIconPath: iconPath, appIconIndex: 0, relaunchCommand: app.isPackaged ? '"' + process.execPath + '"' : '"' + process.execPath + '" "' + app.getAppPath() + '"' + (devMode ? ' --shixu-dev' : ''), relaunchDisplayName: appName });
      window.on('page-title-updated', event => event.preventDefault());
      window.once('ready-to-show', () => window.show());
      window.on('close', event => { if (!quitting) { event.preventDefault(); window.hide(); } });
      window.webContents.on('did-start-loading',()=>{musicState={...musicState,ready:false,playing:false};trayControls?.refresh();});
      window.on('closed', () => { window = null;musicState={...musicState,ready:false,playing:false};trayControls?.refresh(); });
      void window.loadURL(service.url);
      };
      const audit = event => { if (profileArg) fs.appendFileSync(path.join(app.getPath('userData'), 'notification-proof.jsonl'), JSON.stringify({ ...event, at: Date.now() }) + '\n'); };
      reminders = createReminders({ file: path.join(app.getPath('userData'), 'reminders.json'), getWorkspace: service.getWorkspace, supported: Notification.isSupported(),
        onTimer: publishTimer,
        notify: (message, report) => {
          const notification = new Notification({ title: message.title, body: message.body, icon: nativeImage.createFromPath(iconPath), silent: false });
          notifications.add(notification); audit({ ...message, phase: 'requested' });
          notification.on('show', () => { report('shown'); audit({ key: message.key, phase: 'shown' }); });
          notification.on('failed', () => { report('failed'); audit({ key: message.key, phase: 'failed' }); notifications.delete(notification); });
          notification.on('close', () => notifications.delete(notification));
          notification.on('click', () => { notifications.delete(notification); showWorkspace(); });
          notification.show();
        }
      });
      const fromWorkspace = event => { if (!window || event.sender !== window.webContents || !trusted(event.senderFrame?.url || '')) throw Error('请求来源无效'); };
      ipcMain.handle('shixu:open-content-admin',event=>{fromWorkspace(event);showContentAdmin();return {opened:true};});
      ipcMain.handle('shixu:choose-music-directory', async event=>{fromWorkspace(event);const result=await dialog.showOpenDialog(window,{title:'选择本机音乐文件夹',properties:['openDirectory'],...(musicDirectory?{defaultPath:musicDirectory}:{})});if(result.canceled||!result.filePaths[0])return {canceled:true};const selected=fs.realpathSync(result.filePaths[0]);const temporary=libraryConfig+'.tmp';fs.writeFileSync(temporary,JSON.stringify({directory:selected}));fs.renameSync(temporary,libraryConfig);musicDirectory=selected;return {canceled:false};});
      ipcMain.handle('shixu:reminders-state', event => { fromWorkspace(event); return reminders.getState(); });
      ipcMain.handle('shixu:reminders-enable', event => { fromWorkspace(event); const result = reminders.enable(true); reminders.test();trayControls?.refresh(); return result; });
      ipcMain.handle('shixu:timer-sync', (event, timer) => { fromWorkspace(event); return reminders.syncTimer(timer); });
      ipcMain.handle('shixu:music-state',(event,value)=>{fromWorkspace(event);if(!value||typeof value.ready!=='boolean'||typeof value.playing!=='boolean'||typeof value.automatic!=='boolean'||typeof value.title!=='string'||value.title.length>160||(value.id!==null&&!musicCatalog.some(song=>song.id===value.id)))throw Error('音乐状态无效');musicState={ready:value.ready,playing:value.playing,automatic:value.automatic,title:value.title.replace(/[\r\n]/g,' '),id:value.id};trayControls?.refresh();});
      tray = new Tray(nativeImage.createFromPath(iconPath));
      trayControls=createTrayControls({Menu,tray,appName,reminders,catalog:musicCatalog,getMusic:()=>musicState,sendMusic:command=>{if(window&&!window.isDestroyed()&&musicState.ready)window.webContents.send('shixu:music-command',command);},startTimer:()=>{if(window&&!window.isDestroyed()&&musicState.ready)window.webContents.send('shixu:timer-command');else showWorkspace();},open:()=>showWorkspace(),quit:()=>app.quit(),onTimer:publishTimer,onReminder:publishReminder});
      if(profileArg)app.__shixuTrayControls=trayControls;
      tray.on('click', () => showWorkspace());
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        { label: '拾序', submenu: [{ label: '关于' + appName, click: () => dialog.showMessageBox(window, { title: '拾序', message: devMode ? '拾序·开发版 · 独立测试数据' : '拾序 · 任务与精力管理', detail: `桌面版 ${app.getVersion()}\n四季花语 · 16 种花卉主题\n© 2026 车牮。源代码采用 MIT 许可证。\n音乐与品牌素材另行授权。\n第三方开源组件及音乐版权归各自权利人所有。\n本机保存，无需 Docker 或宝塔。\n关闭窗口收进右下角托盘，软件提醒继续运行。\n右键托盘选择“退出拾序”才会停止。` }) }, { type: 'separator' }, { label: '收起到托盘', click: () => window?.hide() }, { label: '发送测试提醒', click: () => { reminders.enable(true); reminders.test(); } }, { label: '退出拾序', role: 'quit' }] },
        { label: '内容', submenu: [{label:'打开内容后台',click:()=>showContentAdmin()}] },
        { label: '数据', submenu: [
          { label: '备份数据…', click: async () => { try { const result = await dialog.showSaveDialog(window, { title: '备份拾序数据', defaultPath: path.join(app.getPath('documents'), `拾序备份-${new Date().toISOString().slice(0,10)}-${Date.now()}.sqlite`), filters: [{ name: '拾序 SQLite 备份', extensions: ['sqlite'] }] }); if (result.canceled || !result.filePath) return; if (fs.existsSync(result.filePath)) throw Error('请选择一个新的文件名，以保留已有备份。'); service.backup(result.filePath); await dialog.showMessageBox(window, { message: '备份已保存', detail: result.filePath }); } catch (error) { dialog.showErrorBox('备份未完成', error.message); } } },
          { label: '打开数据文件夹', click: () => shell.openPath(dataDir) }
        ] },
        { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
        { label: '视图', submenu: [{ role: 'reload', label: '刷新工作台' }, { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { role: 'togglefullscreen', label: '全屏' }] }
      ]));
      showWorkspace();
    } catch (error) {
      dialog.showErrorBox('拾序未能启动', error.code === 'EADDRINUSE' ? `本机端口 ${port} 正被其他程序使用。请关闭占用程序后重新打开拾序。` : error.message);
      app.quit();
    }
  });
  app.on('window-all-closed', () => { /* The tray and reminder scheduler keep the app running. */ });
  app.on('before-quit', event => {
    quitting = true;
    if (service && !closingService) { event.preventDefault(); closingService = true; reminders?.close(); trayControls?.close();tray?.destroy(); service.close().finally(() => app.quit()); }
  });
}
