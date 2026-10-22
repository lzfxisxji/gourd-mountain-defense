const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const exe=path.resolve('release/守护葫芦山-0.1.0-Windows-x64.exe');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'gourd-portable-qa-'));
 async function launch(){
  await fs.rm(path.join(profile,'DevToolsActivePort'),{force:true});
  const env={...process.env,GOURD_TEST_USER_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(exe,['--desktop-qa','--remote-debugging-port=0'],{env,windowsHide:true,stdio:'ignore'});let startupError;child.on('error',e=>startupError=e);
  let port;
  for(let i=0;i<240;i++){if(startupError)throw startupError;try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];if(port)break;}catch{}await delay(250);}
  assert.ok(port,'portable EXE started its embedded Electron runtime');
  const browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);const page=browser.contexts()[0].pages()[0];await page.waitForFunction(()=>window.__qa);
  return {browser,page};
 }
 let run=await launch();assert.ok(run.page.url().startsWith('gourd://game/'));
 await run.page.screenshot({path:'C:/Users/Administrator/.codex/visualizations/2026/10/18/01a14df9-e8d8-70e1-b12e-1ebca3a73fc5/desktop-portable-menu.png'});
 await run.page.getByRole('button',{name:'读取存档',exact:true}).click();
 await run.page.locator('#saveImport').setInputFiles({name:'存档.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,completed:8,coins:12345,slots:7,battle:null,settings:{muted:true,speed:2}}))});
 await run.page.waitForFunction(()=>window.__qa.save.coins===12345);
 await run.page.getByRole('button',{name:'返回菜单',exact:true}).click();
 await run.page.getByRole('button',{name:'退出游戏',exact:true}).click();
 await run.page.getByRole('button',{name:'退出',exact:true}).click();await run.browser.close();await delay(1000);
 run=await launch();assert.equal(await run.page.evaluate(()=>window.__qa.save.coins),12345);assert.equal(await run.page.evaluate(()=>window.__qa.save.completed),8);assert.equal(await run.page.evaluate(()=>window.__qa.save.slots),7);
 await run.page.getByRole('button',{name:'退出游戏',exact:true}).click();await run.page.getByRole('button',{name:'退出',exact:true}).click();await run.browser.close();
 console.log(JSON.stringify({passed:true,exe,profile,checks:['single EXE self extraction and offline launch','native exit button','import JSON','restart persistent storage']}));
})().catch(e=>{console.error(e);process.exit(1)});
