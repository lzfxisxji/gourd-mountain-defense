// Keep the updater's state machine separate from Electron so failure paths can be tested.
class UpdateController{
 constructor(updater,{version,supported=true,notify=()=>{},prepareInstall=async()=>{},flush=()=>{}}={}){
  this.updater=updater;this.notify=notify;this.prepareInstall=prepareInstall;this.flush=flush;
  this.state={status:supported?'idle':'unsupported',currentVersion:version,version:null,notes:'',percent:0,message:supported?'可检查游戏更新':'免安装版请先安装支持自动更新的安装版。'};
  if(!supported)return;
  updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.allowPrerelease=false;updater.allowDowngrade=false;
  updater.on('checking-for-update',()=>this.set({status:'checking',message:'正在检查更新…'}));
  updater.on('update-available',info=>this.set({status:'available',version:info.version,notes:this.notes(info.releaseNotes),percent:0,message:'发现新版本，可下载更新。'}));
  updater.on('update-not-available',()=>this.set({status:'latest',message:'当前已是最新版本。'}));
  updater.on('download-progress',p=>this.set({status:'downloading',percent:Math.max(0,Math.min(100,Number(p.percent)||0)),message:'正在下载更新，游戏可以继续运行。'}));
  updater.on('update-downloaded',info=>this.set({status:'downloaded',version:info.version,percent:100,message:'下载完成，可保存战局并重启更新。'}));
  updater.on('error',()=>this.fail());
 }
 notes(value){return (Array.isArray(value)?value.map(n=>n.note||'').join('\n'):String(value||'')).replace(/<[^>]*>/g,'').slice(0,12000);}
 set(value){Object.assign(this.state,value);this.notify({...this.state});}
 fail(){this.set({status:'error',message:'更新失败，请检查网络后重试；当前游戏和存档不受影响。'});}
 async check(){if(['unsupported','checking','downloading','downloaded','installing'].includes(this.state.status))return {...this.state};try{await this.updater.checkForUpdates();}catch{this.fail();}return {...this.state};}
 async download(){if(this.state.status!=='available')return {...this.state};this.set({status:'downloading',percent:0});try{await this.updater.downloadUpdate();}catch{this.fail();}return {...this.state};}
 async install(){if(this.state.status!=='downloaded')return {...this.state};this.set({status:'installing',message:'正在保存战局并启动更新…'});try{await this.prepareInstall();this.flush();this.updater.quitAndInstall(false,true);}catch{this.set({status:'downloaded',message:'战局保存或安装启动失败，请重试；也可先手动保存战局。'});}return {...this.state};}
}
module.exports={UpdateController};
