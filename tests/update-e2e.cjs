const {_electron:electron}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process');const {promisify}=require('node:util');const exec=promisify(execFile);const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const fixture=path.resolve('release/update-test'),profile=await fs.mkdtemp(path.join(os.tmpdir(),'gourd-update-e2e-')),install=path.join(profile,'installed');
 const server=http.createServer(async(req,res)=>{try{const file=path.join(fixture,path.basename(new URL(req.url,'http://local').pathname));let data=await fs.readFile(file);if(file.endsWith('.yml'))data=Buffer.from(data.toString()+'\nreleaseNotes: "更新测试：保留存档并升级至 0.2.1"\n');res.setHeader('Content-Length',data.length);res.end(data);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const env={...process.env,GOURD_DESKTOP_QA:'1',GOURD_TEST_USER_DATA:profile,GOURD_UPDATE_TEST_FEED:'http://127.0.0.1:'+server.address().port};delete env.ELECTRON_RUN_AS_NODE;
 let app;
 try{
  console.log('launch old');app=await electron.launch({executablePath:path.resolve('release/0.2.0/win-unpacked/GourdMountainDefense.exe'),args:['--desktop-qa','--disable-gpu'],env});let page=await app.firstWindow();console.log('window');await page.waitForFunction(()=>window.__qa&&window.gameUpdates);
  console.log('bridge ready');await app.evaluate(({app},directory)=>{process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json')('electron-updater').autoUpdater.installDirectory=directory;},install);
  console.log('install dir set');await page.getByRole('button',{name:'读取存档',exact:true}).click();await page.locator('#saveImport').setInputFiles({name:'存档.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,completed:7,coins:12345,slots:7,battle:null,settings:{muted:true,speed:1.5}}))});await page.waitForFunction(()=>window.__qa.save.completed===7);
  await page.getByRole('button',{name:'返回菜单',exact:true}).click();await page.getByRole('button',{name:'闯关模式1-8',exact:true}).click();await page.getByRole('button',{name:'选择四娃',exact:true}).click();await page.getByRole('button',{name:'开始战斗',exact:true}).click();
  await page.evaluate(()=>{window.__qa.freeze();window.__qa.game.place('fire',2,0);window.__qa.freeze(false);});
  console.log('battle ready');await page.getByRole('button',{name:'检查游戏更新',exact:true}).click();await page.locator('[data-update="download"]').waitFor({state:'visible',timeout:60000});
  assert.equal(await page.evaluate(()=>window.__qa.paused),true);assert.equal(await page.evaluate(()=>window.__qa.save.battle.plants.length),1);
  console.log('available verified');
  await page.locator('[data-update="download"]').click();await page.locator('[data-update="install"]').waitFor({state:'visible',timeout:120000});
  assert.equal((await page.evaluate(()=>window.gameUpdates.state())).status,'downloaded');console.log('download verified');
  await page.locator('[data-update="install"]').click().catch(()=>{});
  // A debugger keeps Node alive during app.quit; only the QA process needs this release.
  await delay(700);app.process().kill();await Promise.race([app.close().catch(()=>{}),delay(3000)]);app=null;
  const exe=path.join(install,'GourdMountainDefense.exe');let restarted=false;
  for(let i=0;i<120;i++){
   await delay(1000);
   const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',"$p=Get-CimInstance Win32_Process -Filter \"name='GourdMountainDefense.exe'\" | Where-Object { $_.ExecutablePath -eq $env:GOURD_QA_EXE }; if($p){Write-Output 'RESTARTED'; $p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }}"],{env:{...env,GOURD_QA_EXE:exe}});
   if(stdout.includes('RESTARTED')){restarted=true;break;}
  }
  assert.ok(restarted,'installer installed and restarted the newer app');await delay(1000);if(app)await app.close().catch(()=>{});app=null;
  app=await electron.launch({executablePath:exe,args:['--desktop-qa','--disable-gpu'],env});page=await app.firstWindow();await page.waitForFunction(()=>window.__qa&&window.gameUpdates);
  assert.equal((await page.evaluate(()=>window.gameUpdates.state())).currentVersion,'0.2.1');assert.equal(await page.evaluate(()=>window.__qa.save.coins),12345);assert.equal(await page.evaluate(()=>window.__qa.save.slots),7);
  await page.getByRole('button',{name:'闯关模式1-8',exact:true}).click();assert.equal(await page.evaluate(()=>window.__qa.game.plants[0].type),'fire');
  await app.close();app=null;const uninstaller=(await fs.readdir(install)).find(n=>/^Uninstall.*\.exe$/i.test(n));if(uninstaller)await exec(path.join(install,uninstaller),['/S']);
  console.log(JSON.stringify({passed:true,from:'0.2.0',to:'0.2.1',profile,checks:['real update metadata','installer SHA512 verification and download','pause and save','actual NSIS installation and restart','coins/cards/battle preserved']}));
 }catch(e){console.error('TEST ERROR',e);throw e;}finally{if(app)await Promise.race([app.close().catch(()=>{}),delay(3000)]);server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
