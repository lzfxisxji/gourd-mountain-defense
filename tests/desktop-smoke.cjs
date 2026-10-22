const { _electron: electron }=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const executable=path.resolve(process.argv[2]||'release/win-unpacked/GourdMountainDefense.exe');
const screenshots='C:/Users/Administrator/.codex/visualizations/2026/10/18/01a14df9-e8d8-70e1-b12e-1ebca3a73fc5';
(async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'gourd-desktop-qa-'));
 const env={...process.env,GOURD_TEST_USER_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 let client;
 try{
  client=await electron.launch({executablePath:executable,args:['--desktop-qa'],env,timeout:60000});
  let page=await client.firstWindow();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+':'+r.status());});
  await page.waitForFunction(()=>window.__qa);assert.equal(new URL(page.url()).protocol,'gourd:');
  assert.deepEqual(await page.evaluate(()=>[typeof require,typeof process]),['undefined','undefined']);
  assert.equal(await client.evaluate(({app})=>app.getPath('userData')),profile);
  await page.screenshot({path:path.join(screenshots,'desktop-menu.png')});
  // Use the actual file-import UI to verify migration from a browser export.
  await page.getByRole('button',{name:'读取存档',exact:true}).click();
  await page.locator('#saveImport').setInputFiles({name:'网页存档.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,completed:7,slots:6,coins:30000,unlocks:{blackcat:false,wukong:false},battle:null,settings:{muted:true,speed:1.5}}))});
  await page.waitForFunction(()=>window.__qa.save.completed===7);assert.equal(await page.evaluate(()=>window.__qa.save.coins),30000);
  await page.getByRole('button',{name:'返回菜单',exact:true}).click();
  await page.getByRole('button',{name:'商店',exact:true}).click();await page.getByRole('tab',{name:'伙伴招募',exact:true}).click();await page.getByRole('button',{name:'孙悟空招募',exact:true}).click();
  await page.getByRole('button',{name:'购买 · 20,000 金币',exact:true}).click();assert.equal(await page.evaluate(()=>window.__qa.save.coins),10000);
  await page.getByRole('button',{name:'返回菜单',exact:true}).click();
  await page.getByRole('button',{name:'闯关模式1-8',exact:true}).click();await page.getByRole('button',{name:'选择四娃',exact:true}).click();await page.getByRole('button',{name:'开始战斗',exact:true}).click();
  await page.evaluate(()=>{window.__qa.freeze();const g=window.__qa.game;g.place('fire',2,0);window.__qa.freeze(false);window.__qa.step(20);window.__qa.freeze();});
  await page.getByRole('button',{name:'保存',exact:true}).click();assert.equal(await page.evaluate(()=>window.__qa.save.battle.plants.length),1);
  await page.screenshot({path:path.join(screenshots,'desktop-battle.png')});
  assert.deepEqual(errors,[]);
  await client.close();client=null;
  client=await electron.launch({executablePath:executable,args:['--desktop-qa'],env,timeout:60000});page=await client.firstWindow();await page.waitForFunction(()=>window.__qa);
  assert.equal(await page.evaluate(()=>window.__qa.save.coins),10000);assert.equal(await page.evaluate(()=>window.__qa.save.unlocks.wukong),true);
  await page.getByRole('button',{name:'闯关模式1-8',exact:true}).click();assert.equal(await page.evaluate(()=>window.__qa.game.plants[0].type),'fire');
  await client.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();w.webContents.sendInputEvent({type:'keyDown',keyCode:'F11'});w.webContents.sendInputEvent({type:'keyUp',keyCode:'F11'});});await page.waitForTimeout(500);
  assert.equal(await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),true);
  await client.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});});

  console.log(JSON.stringify({passed:true,executable,profile,checks:['offline custom protocol','isolated renderer','browser save import','shop purchase','battle placement','save and app relaunch','F11 fullscreen'],errors}));
 }finally{if(client)await client.close();}
})().catch(e=>{console.error(e);process.exit(1)});
