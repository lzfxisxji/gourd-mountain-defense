export function initDesktopUpdates({pauseForUpdates,onAvailable}={}){
 const api=window.gameUpdates;if(!api)return;
 const menu=document.createElement('button');menu.className='desktop-update-button';menu.textContent='检查更新';document.querySelector('#menu').append(menu);
 const toolbar=document.createElement('button');toolbar.textContent='更新';toolbar.setAttribute('aria-label','检查游戏更新');document.querySelector('#toolbar').append(toolbar);
 const panel=document.createElement('dialog');panel.className='update-dialog';panel.setAttribute('aria-label','游戏更新');
 panel.innerHTML='<h2>游戏更新</h2><p class="update-version"></p><p class="update-message" role="status"></p><progress max="100" value="0" aria-label="更新下载进度"></progress><p class="update-percent"></p><pre class="update-notes"></pre><div class="update-actions"><button data-update="check">检查更新</button><button data-update="download">下载更新</button><button data-update="install">保存并重启更新</button><button data-update="close">稍后再说</button></div>';
 document.body.append(panel);let state={},resume=null,announced='';
 const render=value=>{
  state=value;menu.textContent=(['available','downloaded'].includes(state.status)?'有更新':'检查更新')+' · v'+state.currentVersion;
  panel.querySelector('.update-version').textContent='当前版本 '+state.currentVersion+(state.version?' → '+state.version:'');
  panel.querySelector('.update-message').textContent=state.message||'';
  panel.querySelector('.update-notes').textContent=state.notes||'';
  const progress=panel.querySelector('progress');progress.value=state.percent;progress.hidden=!['downloading','downloaded'].includes(state.status);
  panel.querySelector('.update-percent').textContent=state.status==='downloading'?Math.floor(state.percent)+'%':'';
  panel.querySelector('[data-update="check"]').hidden=['unsupported','checking','downloading','downloaded','installing'].includes(state.status);
  panel.querySelector('[data-update="download"]').hidden=state.status!=='available';
  panel.querySelector('[data-update="install"]').hidden=state.status!=='downloaded';
  panel.querySelector('[data-update="close"]').disabled=state.status==='installing';
  if(state.status==='available'&&announced!==state.version){announced=state.version;onAvailable?.('发现新版本 '+state.version+'，可点击“更新”下载。');}
 };
 const invoke=async action=>{try{render(await api[action]());}catch{render({...state,status:'error',message:'暂时无法连接更新服务，请稍后重试。'});}};
 const open=()=>{if(panel.open)return;resume=pauseForUpdates?.();panel.showModal();if(state.status==='idle')invoke('check');};
 menu.onclick=open;toolbar.onclick=open;
 for(const action of ['check','download','install'])panel.querySelector('[data-update="'+action+'"]').onclick=()=>invoke(action);
 panel.querySelector('[data-update="close"]').onclick=()=>panel.close();
 panel.addEventListener('cancel',e=>{if(state.status==='installing')e.preventDefault();});
 panel.addEventListener('close',()=>{resume?.();resume=null;});
 api.onState(render);api.state().then(render);
}
