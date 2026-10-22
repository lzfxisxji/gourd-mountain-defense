const {app,BrowserWindow,Menu,protocol,net,session,ipcMain}=require('electron');
const {UpdateController}=require('./update-controller.cjs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const origin='gourd://game';
const testing=process.argv.includes('--desktop-qa')||process.env.GOURD_DESKTOP_QA==='1';
app.setName('GourdMountainDefense');
app.setPath('userData',testing&&process.env.GOURD_TEST_USER_DATA?path.resolve(process.env.GOURD_TEST_USER_DATA):path.join(app.getPath('appData'),'GourdMountainDefense'));
protocol.registerSchemesAsPrivileged([{scheme:'gourd',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);

if(!app.requestSingleInstanceLock()){app.quit();}
else{
 let win;
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(()=>{
  const root=app.getAppPath();
  protocol.handle('gourd',async request=>{
   const url=new URL(request.url);
   if(url.host!=='game'||!['GET','HEAD'].includes(request.method))return new Response('Forbidden',{status:403});
   let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';}catch{return new Response('Bad request',{status:400});}
   const file=path.resolve(root,relative),inside=path.relative(root,file);
   if(inside.startsWith('..')||path.isAbsolute(inside)||!(/^(index\.html|style\.css)$/.test(relative)||/^(assets|src)\//.test(relative)))return new Response('Not found',{status:404});
   try{
    const response=await net.fetch(pathToFileURL(file).toString());
    const headers=new Headers(response.headers);
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    return new Response(response.body,{status:response.status,headers});
   }catch{return new Response('Not found',{status:404});}
  });
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:600,title:'葫芦兄弟 · 守护葫芦山',backgroundColor:'#142b23',icon:path.join(root,'desktop/icon.ico'),autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:testing}});
  const {autoUpdater}=require('electron-updater');
  // Production feed comes from the packaged app-update.yml. Never ship GitHub tokens.
  const testFeed=testing&&process.env.GOURD_UPDATE_TEST_FEED;
  if(testFeed){const url=new URL(testFeed);if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw Error('QA feed must be loopback');autoUpdater.setFeedURL({provider:'generic',url:testFeed});}
  const updates=new UpdateController(autoUpdater,{version:app.getVersion(),supported:app.isPackaged&&!process.env.PORTABLE_EXECUTABLE_DIR,
   notify:state=>{if(win&&!win.isDestroyed())win.webContents.send('game-update:changed',state);},
   prepareInstall:async()=>{if(!win||win.isDestroyed())throw Error('Window closed');const ok=await win.webContents.executeJavaScript("window.prepareGameUpdate ? window.prepareGameUpdate() : false");if(!ok)throw Error('Save failed');},
   flush:()=>session.defaultSession.flushStorageData()
  });
  for(const [action,handler] of Object.entries({state:()=>({...updates.state}),check:()=>updates.check(),download:()=>updates.download(),install:()=>updates.install()}))ipcMain.handle('game-update:'+action,event=>{
   if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!event.senderFrame.url.startsWith(origin+'/'))throw Error('Invalid update request');
   return handler();
  });
  win.webContents.once('did-finish-load',()=>{if(!testing){setTimeout(()=>updates.check(),5000).unref();setInterval(()=>updates.check(),6*60*60*1000).unref();}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
  win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){win.setFullScreen(!win.isFullScreen());event.preventDefault();}else if(input.type==='keyDown'&&input.key==='Escape'&&win.isFullScreen()){win.setFullScreen(false);event.preventDefault();}});
  win.once('ready-to-show',()=>win.show());
  win.on('closed',()=>{session.defaultSession.flushStorageData();win=null;});
  win.loadURL(origin+'/'+(testing?'?qa=1':''));
 });
 app.on('window-all-closed',()=>app.quit());
}
