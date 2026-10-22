const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('gameUpdates',{
 state:()=>ipcRenderer.invoke('game-update:state'),
 check:()=>ipcRenderer.invoke('game-update:check'),
 download:()=>ipcRenderer.invoke('game-update:download'),
 install:()=>ipcRenderer.invoke('game-update:install'),
 onState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('game-update:changed',listener);return()=>ipcRenderer.removeListener('game-update:changed',listener);}
});
