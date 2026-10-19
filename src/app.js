import {advanceBattle} from './timing.js';
import {SLOT_PRICES,buySlot,victoryCoins} from './economy.js';
import {Game,GRID,CHARACTERS,LEVELS,MONSTERS} from './engine.js';
import {LAST_LEVEL,adventureLevel} from './levels.js';
import {POSES,WORLD_SCALE,plantPose,enemyPose} from './animation.js';
import {ALMANAC_CHARACTERS,isCharacterUnlocked} from './roster.js';
import {SAVE_KEY,emptySave,decodeSave,encodeSave,snapshotGame,restoreGame} from './storage.js';
const $=s=>document.querySelector(s), canvas=$('#board'),ctx=canvas.getContext('2d'),W=1672,H=941;
const map=new Image(),sprites=new Image();map.src='assets/maps/chapter-01-wood-clean-v2.png';sprites.src='assets/sprites/characters-clean.png';
const frog=new Image();frog.src='assets/sprites/frog-trident.png';
const animationImages=Object.fromEntries([...new Set(Object.values(POSES).map(p=>p.file))].map(file=>{const img=new Image();img.src=`assets/animation/${file}.png`;return[file,img];}));
let bookPreview=null;
let game=null,selected=null,shovel=false,paused=false,last=0,hover=null,muted=false,audio=null,toastTimer,waveUntil=0,ended=false,aimingId=null;
let storageIssue=false,lastAutoSave=0,speed=1;
function readSave(){try{const raw=localStorage.getItem(SAVE_KEY);const result=raw?decodeSave(raw):emptySave();storageIssue=false;return result;}catch{storageIssue=true;return emptySave();}}
let save=readSave();muted=save.settings.muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;refreshAdventure();
function refreshAdventure(){speed=save.settings.speed??1;$('#battleSpeed').value=speed;$('#battleSpeed').setAttribute('aria-valuetext',`${speed}倍速`);$('#speedLabel').textContent=`${speed}×`;$('.menu-coins').textContent=`${save.coins.toLocaleString()} 金币`;$('#wallet strong').textContent=save.coins.toLocaleString();const name=LEVELS[adventureLevel(save)].name;$('.stage-number').textContent=name;$('.adventure').setAttribute('aria-label',`闯关模式${name}`);}
function persist(){try{save.settings={muted,speed};localStorage.setItem(SAVE_KEY,encodeSave(save));refreshAdventure();return true;}catch{toast('保存失败：浏览器存储不可用或存档数据无效');return false;}}
function checkpoint(notify=false){if(!game||game.status!=='playing')return false;save.battle=snapshotGame(game);save.updatedAt=new Date().toISOString();const ok=persist();if(ok){lastAutoSave=game.time;if(notify)toast('战局已保存，可以从主菜单读取继续');}return ok;}
function resumeBattle(){try{const restored=restoreGame(save.battle);game=restored;selected=null;shovel=false;paused=true;ended=false;lastAutoSave=game.time;waveUntil=0;aimingId=null;$('#menu').hidden=true;$('#play').hidden=false;$('#levelLabel').textContent=`木境 · 葫芦藤园　${game.cfg.name}`;makeCards();updateHud();draw();modal('战局已恢复',`<p>${game.cfg.name} · 已进行 ${Math.floor(game.time)} 秒<br>灵气 ${game.energy} · 场上 ${game.plants.length} 个角色</p>`,[{text:'继续守护',action:()=>{closeModal();paused=false;}},{text:'返回菜单',secondary:true,action:menu}]);}catch{toast('无法恢复这个战局，现有存档未被覆盖');}}
function openSaveMenu(){
 save=readSave();refreshAdventure();const issue=storageIssue;
 const summary=issue?'存档无法读取，可导入之前导出的备份。':save.battle?`可恢复战局：${LEVELS[save.battle.level].name} · ${Math.floor(save.battle.time)} 秒 · ${save.battle.energy} 灵气`:save.completed?'已保存通关进度，暂无进行中的战局。':'暂无存档，开始游戏后可手动或自动保存。';
 const buttons=[];if(save.battle)buttons.push({text:'继续保存的战局',action:resumeBattle});else if(save.completed)buttons.push({text:save.completed>=LAST_LEVEL?`重玩 1-${LAST_LEVEL}`:`继续 1-${save.completed+1}`,action:()=>start(Math.min(save.completed+1,LAST_LEVEL))});
 else if(!issue)buttons.push({text:'开始 1-1',action:enterAdventure});
 if(save.battle||save.completed)buttons.push({text:'导出存档',secondary:true,action:()=>{const blob=new Blob([encodeSave(save)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='葫芦山存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});
 buttons.push({text:'导入存档',secondary:true,action:()=>$('#saveImport').click()},{text:'返回菜单',secondary:true,action:closeModal});
 const current=adventureLevel(save),date=save.updatedAt?new Date(save.updatedAt):null;
 const updated=date&&!Number.isNaN(date.getTime())?date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'暂无记录';
 const unlocked=['fire','vine','wall','nezha','pangolin','tall','water','seven','erwa'].filter(id=>isCharacterUnlocked(id,save.completed)).map(id=>ALMANAC_CHARACTERS[id].name).join('、');
 const progress=Object.entries(LEVELS).map(([key,cfg])=>{const level=Number(key),done=save.completed>=level,active=level===current;return `<li class="${done?'done ':''}${active?'current':''}"><strong>${cfg.name}</strong><small>${active?(done?'可重玩':'当前'):done?'已通关':'未解锁'}</small></li>`;}).join('');
 modal('存档与关卡进度',`<div class="save-current"><span>当前关卡</span><strong>${LEVELS[current].name}</strong><span>${LEVELS[current].title}</span></div><ol class="save-progress" aria-label="关卡进度">${progress}</ol><p class="save-summary">${summary}</p><dl class="save-details"><dt>已通关</dt><dd>${save.completed} / ${LAST_LEVEL} 关${save.completed?`（1-1 ～ 1-${save.completed}）`:''}</dd><dt>已解锁角色</dt><dd>${unlocked}</dd><dt>金币与卡槽</dt><dd>${save.coins.toLocaleString()} 金币 · ${save.slots} 个卡槽</dd><dt>最近保存</dt><dd>${updated}</dd></dl><p class="save-help">每 10 秒自动保存；暂停、返回菜单时也会保存。</p>`,buttons);
 $('#modal').classList.add('save-modal');
}
$('#saveImport').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>1000000)throw Error();const imported=decodeSave(await file.text());const raw=encodeSave(imported);localStorage.setItem(SAVE_KEY,raw);save=imported;muted=save.settings.muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;openSaveMenu();toast('存档导入成功');}catch{toast('导入失败：文件无效，原存档已保留');}});
$('#battleSpeed').addEventListener('input',e=>{speed=Number(e.target.value);$('#speedLabel').textContent=`${speed}×`;e.target.setAttribute('aria-valuetext',`${speed}倍速`);persist();});
$('#saveBattle').onclick=()=>checkpoint(true);
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function tone(type){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type==='shoot'?'triangle':'sine';o.frequency.setValueAtTime(({plant:280,shoot:180,collect:820,won:660,lost:100,mower:90,kill:130})[type]||360,audio.currentTime);o.frequency.exponentialRampToValueAtTime(type==='collect'?1200:80,audio.currentTime+.12);g.gain.setValueAtTime(type==='shoot'?.016:.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.18);}catch{}}
function modal(title,body,buttons){$('#modal').classList.remove('book-modal','save-modal','shop-modal','loadout-modal');$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalButtons').replaceChildren();for(const b of buttons){const el=document.createElement('button');el.textContent=b.text;if(b.secondary)el.className='secondary';el.disabled=!!b.disabled;el.onclick=b.action;$('#modalButtons').append(el);}$('#modal').hidden=false;}
function closeModal(){$('#modal').hidden=true;bookPreview=null;}
function menu(){checkpoint();aimingId=null;game=null;paused=false;ended=false;$('#play').hidden=true;$('#menu').hidden=false;closeModal();refreshAdventure();}
function enterAdventure(){save=readSave();refreshAdventure();if(save.battle){resumeBattle();closeModal();paused=false;}else start(adventureLevel(save));}
$('.adventure').onclick=enterAdventure;
function openShop(chosen=null){
 save=readSave();refreshAdventure();const next=save.slots+1,slot=chosen??Math.min(next,10),price=SLOT_PRICES[slot],owned=slot<=save.slots,eligible=slot===next;
 const description=owned?'这个卡槽已经装好了，孩子们可以带上更多伙伴啦！':!eligible?`先把卡栏扩到 ${slot-1} 槽，再来看看这件吧。`:save.coins>=price?'金币攒够啦！扩充卡栏，就能多带一位伙伴守护葫芦山。':`再攒 ${(price-save.coins).toLocaleString()} 金币，就能多带一位伙伴。`;
 modal('爷爷的杂货铺',`<div class="stall-title">爷爷的杂货铺<small>葫芦山 · 行脚货摊</small></div><div class="shop-balance">钱袋 <b>${save.coins.toLocaleString()}</b><small>金币</small></div><div class="shop-dialogue">${description}</div><div class="shop-items">${Object.entries(SLOT_PRICES).map(([key,cost])=>`<button class="shop-product ${+key===slot?'chosen':''} ${+key<=save.slots?'owned':''}" data-slot="${key}" aria-label="${key}个卡槽" aria-pressed="${+key===slot}"><div class="tray-product" style="--product-slots:${key}">${Array.from({length:+key},()=>'<i></i>').join('')}</div><strong>${key} 个卡槽</strong><span class="price-tag">${cost.toLocaleString()} 金币</span><small>${+key<=save.slots?'已购':+key===next?'可升级':'待解锁'}</small></button>`).join('')}</div><div class="shop-description"><strong>${slot} 槽角色卡栏</strong><span>可携带 ${slot} 位角色上阵 · 永久扩充</span><small>当前 ${save.slots} 槽 / 最多 10 槽 · 点击货架上的商品查看</small></div>`,[{text:owned?'已经购买':!eligible?'请先购买前一槽':save.coins<price?`金币不足 · 还差 ${(price-save.coins).toLocaleString()}`:`购买 · ${price.toLocaleString()} 金币`,disabled:owned||!eligible||save.coins<price,action:()=>{const before={...save};if(buySlot(save)){save.updatedAt=new Date().toISOString();if(persist()){openShop();toast(`已扩充到 ${save.slots} 个卡槽`);}else save=before;}}},{text:'返回菜单',secondary:true,action:closeModal}]);$('#modal').classList.add('shop-modal');for(const button of document.querySelectorAll('[data-slot]'))button.onclick=()=>openShop(Number(button.dataset.slot));
}
$('.shop-button').onclick=openShop;

const roleNotes={
 nezha:{unlock:'通关 1-3 解锁，1-4 起可用',description:'对应樱桃炸弹。放置后可以等待，点击场上的哪吒，再点击草坪指定 3×3 区域释放火焰。附近出现妖怪时立即对自身周围 3×3 自动释放；使用一次后退场。'},
 pangolin:{unlock:'通关 1-4 解锁，1-5 起可用',description:'对应土豆地雷。种下后埋伏地下，14 秒后探头待命；同一行妖怪靠近时触发一次范围攻击，随后退场。未准备好时仍会受到攻击。'},
 tall:{unlock:'通关 1-5 解锁，1-6 起可上阵',description:'对应高坚果。身形高大、耐久更高，抵挡妖怪。可在开局选角时加入阵容，与三娃形成不同的防御选择。'},water:{unlock:'通关 1-6 解锁，1-7 起可用',description:'对应寒冰射手。发射蓝色水弹，造成 20 点伤害，使妖怪移动和近身攻击节奏减半，持续 10 秒；再次命中刷新时间，不叠加减速。'},erwa:{unlock:'通关 1-8 解锁，1-9 起可用',description:'对应双发射手。每轮连续发射两枚金光弹，每枚 20 点伤害，可攻击本行地面和飞行妖怪。'},seven:{unlock:'通关 1-7 解锁，1-8 起可用',description:'对应食人花。使用宝葫芦吸收本行前方近距离的单个妖怪，随后抱住葫芦炼化 42 秒，期间不能再次吸收。可吸收本行前方一格内的地面普通妖怪；无法吸收蝙蝠精或蛇精。'},fire:{unlock:'初始角色',description:'向本行前方吐出火焰弹，造成单体伤害。青蛙精进入草坪后才开始攻击。'},vine:{unlock:'通关 1-1 解锁',description:'首次种下 8 秒后产出灵气，此后每 24 秒产出一次，每次 25 灵气。点击灵气球收集。'},wall:{unlock:'通关 1-2 解锁',description:'铜头铁臂，阻挡妖怪并承受近身攻击。本版通关后解锁，后续关卡可上阵。'}};
function openAlmanac(category='roles',id=category==='roles'?'fire':'frog'){
 save=readSave();const isRole=category==='roles',entries=isRole?Object.entries(ALMANAC_CHARACTERS):Object.entries(MONSTERS),item=(isRole?ALMANAC_CHARACTERS:MONSTERS)[id],notes=roleNotes[id];
 const unlocked=!isRole||isCharacterUnlocked(id,save.completed);
 const details=isRole?[
  ['放置消耗',`${item.cost} 灵气`],['生命值',item.hp],['卡片冷却',`${item.cooldown} 秒`],
  ...(item.role==='shooter'?[['攻击伤害',`${item.damage} / 发${item.burstCount?' · 每轮两发':''}`],['攻击间隔',`${item.interval} 秒`]]:[]),
  ...(item.slowDuration?[['减速效果',`50% · ${item.slowDuration} 秒`]]:[]),
  ...(item.role==='producer'?[['资源产出','25 灵气 / 次']]:[]),
  ...(item.role==='absorber'?[['定位','近距离单体吸收'],['炼化时间',`${item.refineTime} 秒`]]:[]),
  ...(item.role==='caster'?[['技能伤害',item.damage],['作用范围','3 × 3 格']]:[]),
  ...(item.role==='mine'?[['准备时间',`${item.armTime} 秒`],['触发伤害',item.damage]]:[]),
  ...(item.role==='wall'?[['定位','防御阻挡']]:[])
 ]:[['生命值',item.hp],['行动方式',item.flying?'飞行 · 越过地面阻挡':'地面近身攻击'],['移动速度',id==='snake'?'缓慢':item.flying?'略快':'缓慢'],['出现关卡',id==='snake'?'1-10':item.flying?'1-6 ～ 1-10':'1-1 ～ 1-10'],...(id==='snake'?[['爆炸抗性','每次最多承受 500 伤害'],['冻结技能','每 40 秒随机冻结一位角色 8 秒']]:[])];
 const stats=details.map(([key,value])=>`<dt>${key}</dt><dd>${value}</dd>`).join('');
 modal('葫芦山图鉴',`<div class="book-tabs" role="tablist" aria-label="图鉴分类"><button role="tab" data-category="roles" aria-selected="${isRole}">角色</button><button role="tab" data-category="monsters" aria-selected="${!isRole}">妖怪</button></div><div class="catalogue-layout"><nav class="book-list" aria-label="${isRole?'角色':'妖怪'}列表">${entries.map(([key,c])=>`<button class="book-entry ${key===id?'chosen':''}" data-entry="${key}" aria-pressed="${key===id}">${c.name}</button>`).join('')}</nav><article class="book-detail"><div class="book-art"><canvas width="220" height="280" aria-label="${item.name}形象"></canvas><span class="book-badge ${unlocked?'':'locked'}">${isRole?(item.implemented===false?'未开放':unlocked?'已解锁':'未解锁'):id==='snake'?'关底妖怪':item.flying?'飞行妖怪':'普通妖怪'}</span></div><div class="book-copy"><h2>${item.name}</h2><span class="book-source">出自《${item.source}》</span><p>${isRole?notes.description:id==='snake'?'手持金色如意，拥有 1000 生命，在 1-10 登场。满血时需要两次哪吒火焰或穿山甲伏击才能击败，每次爆炸最多造成 500 伤害。普通火焰弹、水弹伤害照常，水弹可使其减速。遇到地面角色后停下，用如意近身攻击。登场后每 40 秒随机冻结场上一位角色 8 秒，暂停其攻击、产出与技能准备，冰封期间仍可受伤。':id==='bat'?'蓝紫色蝙蝠翅膀，身穿橙衣、系绿领巾，持长矛飞行。生命值 300，是青蛙精的 1.5 倍。越过地面角色，不触发穿山甲；四娃、五娃可攻击，五娃水弹使其减速，哪吒火焰也能命中。':'黄褐色斑纹，披红色披肩，手持蓝色三叉戟。从右侧进入草坪，遇到角色后停下进行近身攻击。半血失去持戟手臂，改为啃咬；生命归零后掉头倒地。'}</p><dl>${stats}</dl>${isRole?`<div class="unlock-note">${notes.unlock}</div>`:''}</div></article></div>`,[{text:'返回菜单',secondary:true,action:closeModal}]);
 $('#modal').classList.add('book-modal');for(const tab of document.querySelectorAll('[data-category]'))tab.onclick=()=>openAlmanac(tab.dataset.category);for(const button of document.querySelectorAll('[data-entry]'))button.onclick=()=>openAlmanac(category,button.dataset.entry);
 const art=$('.book-art canvas');if(isRole&&item.pose){const paint=()=>{const c=art.getContext('2d');c.clearRect(0,0,art.width,art.height);drawPose(item.pose,110,256,{target:c,scale:['tall','nezha'].includes(id)?1.3:1.65});};const img=animationImages[POSES[item.pose].file];if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}else if(isRole)paintPortrait(art,item.sprite);else{const name=enemyPose({type:id},0),img=animationImages[POSES[name].file];const paint=()=>{const c=art.getContext('2d');c.clearRect(0,0,art.width,art.height);drawPose(name,110,250,{target:c,scale:id==='snake'?1.05:id==='bat'?1.25:1.5});};if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}
 bookPreview=null;const demo=document.createElement('button');demo.className='pose-demo';demo.textContent='动作演示';demo.onclick=()=>{bookPreview={category,id,start:performance.now()};};$('.book-art').append(demo);
}
$('.almanac-button').onclick=()=>openAlmanac();
$('.load').onclick=openSaveMenu;
$('.endless').onclick=()=>modal('无尽模式', '<p>此模式暂未开放。</p><p>当前版本可体验 1-1 ～ 1-10 十个闯关关卡。</p>',[{text:'进入闯关',action:enterAdventure},{text:'返回菜单',secondary:true,action:closeModal}]);
$('.challenge').onclick=()=>modal('趣味挑战','<p>此模式暂未开放。</p><p>后续可加入限定阵容、低资源与特殊敌潮。</p>',[{text:'进入闯关',action:enterAdventure},{text:'返回菜单',secondary:true,action:closeModal}]);
$('.exit').onclick=()=>modal('退出游戏', '<p>通关进度已保存在本机浏览器。</p>',[{text:'退出',action:()=>{try{window.close();}catch{}modal('游戏已退出','<p>可以安全关闭此标签页。</p>',[{text:'返回游戏',action:menu}]);}},{text:'返回菜单',secondary:true,action:closeModal}]);
function start(level){
 if(!LEVELS[level])return;
 const pool=['vine','fire','wall','nezha','pangolin','tall','water','seven','erwa'].filter(id=>isCharacterUnlocked(id,save.completed)&&CHARACTERS[id]);
 // The very first tutorial goes straight to its one available character.
 if(pool.length===1){launchBattle(level,pool);return;}
 const recommended=level>=9?['vine','erwa','water','tall','seven','nezha','pangolin','fire','wall']:level===8?['vine','fire','water','tall','seven','nezha','pangolin','wall']:level>=7?['vine','fire','water','tall','nezha','pangolin','wall']:LEVELS[level].cards;
 let deck=[];
 const cardMarkup=(id,attrs='')=>`<button class="pick-card" ${attrs}><canvas width="140" height="130"></canvas><strong>${CHARACTERS[id].name}</strong><small>${CHARACTERS[id].cost} 灵气</small></button>`;
 function renderPicker(){
  modal('选择你的角色',`<div class="prebattle-top"><div class="tray-label">上阵角色<strong>${deck.length} / ${save.slots}</strong></div><div class="loadout-tray" style="--slots:${save.slots}">${Array.from({length:save.slots},(_,i)=>deck[i]?cardMarkup(deck[i],`data-remove="${deck[i]}" aria-label="撤回${CHARACTERS[deck[i]].name}"`):'<div class="prebattle-empty" aria-label="空卡槽"></div>').join('')}</div></div><div class="selection-shelf"><div class="shelf-heading"><h2>选择你的角色</h2><span>${LEVELS[level].name} · ${LEVELS[level].title}</span></div><div class="loadout-pool">${pool.map(id=>cardMarkup(id,`data-pick="${id}" aria-pressed="${deck.includes(id)}" aria-label="选择${CHARACTERS[id].name}"`)).join('')}</div><div class="prebattle-tip">点击下方卡牌加入阵容 · 点击上方卡牌撤回</div></div><aside class="enemy-preview"><div class="enemy-heading">本关妖怪 <span>${LEVELS[level].schedule.length} 只</span></div><div class="enemy-figures">${[...new Set(LEVELS[level].schedule.map(s=>s.type??'frog'))].map(type=>`<canvas width="220" height="280" data-enemy-preview="${type}" aria-label="${MONSTERS[type].name}预览"></canvas>`).join('')}</div><div class="enemy-caption">${[...new Set(LEVELS[level].schedule.map(s=>s.type??'frog'))].map(type=>MONSTERS[type].name).join(' · ')}<small>${level===10?'蛇精：1000 生命 · 两次爆炸击败':level>=6?'注意空中来袭的蝙蝠精':'普通妖怪 · 缓慢前进'}</small></div></aside><div class="loadout-count">已选 <b>${deck.length} / ${save.slots}</b> · 最多携带 ${save.slots} 位角色</div>`,[{text:'开始战斗',disabled:deck.length===0,action:()=>{launchBattle(level,deck);closeModal();paused=false;}},{text:'推荐阵容',secondary:true,action:()=>{deck=recommended.filter(id=>pool.includes(id)).slice(0,save.slots);renderPicker();}},{text:'返回菜单',secondary:true,action:menu}]);
  $('#modal').classList.add('loadout-modal');
  for(const el of document.querySelectorAll('[data-pick],[data-remove]')){
   const id=el.dataset.pick||el.dataset.remove;paintCardPortrait(el.querySelector('canvas'),id);
   if(el.dataset.pick)el.classList.toggle('picked',deck.includes(id));
   el.onclick=()=>{if(el.dataset.remove||deck.includes(id))deck=deck.filter(x=>x!==id);else if(deck.length<save.slots)deck.push(id);else{toast(`最多上阵 ${save.slots} 位，请先撤回一位角色`);return;}renderPicker();};
  }
  for(const art of document.querySelectorAll('[data-enemy-preview]')){const type=art.dataset.enemyPreview,name=enemyPose({type},0),img=animationImages[POSES[name].file];const paint=()=>drawPose(name,110,265,{target:art.getContext('2d'),scale:type==='snake'?1:type==='bat'?1.1:1.35});if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}

 }
 // Do not let Escape resume a finished/restarted battle beneath the picker.
 game=null;paused=true;ended=false;$('#play').hidden=true;$('#menu').hidden=false;renderPicker();
}
function launchBattle(level,deck){game=new Game(level);game.equip(deck,save.slots);aimingId=null;selected=null;shovel=false;paused=true;ended=false;waveUntil=0;lastAutoSave=0;$('#menu').hidden=true;$('#play').hidden=false;$('#levelLabel').textContent=`木境 · 葫芦藤园　${LEVELS[level].name}`;makeCards();updateHud();draw();checkpoint();const tips={1:'点击四娃卡片，再点击亮起的草地放置。点击金色灵气球收集资源，每个增加 25 灵气。',2:'先种小葫芦藤生产灵气，再用四娃守住三条路线。',3:'五条路线全部开放。把三娃放在四娃前方，阻挡青蛙精。',4:'点击场上的哪吒，再点击目标格，指定 3×3 火焰区域。妖怪靠近哪吒时会自动释放，使用后退场。',5:'穿山甲种下后埋伏 14 秒，探头后可触发伏击。提前布置，准备期间用三娃保护。',6:'大娃拥有 8000 耐久，将他部署在前排，为后方输出争取时间。',7:'五娃的水弹使妖怪移动和近身攻击减半，持续 10 秒。合理取舍阵容，搭配火焰与防御。',8:'空中与地面妖怪交替来袭，保留射手应对蝙蝠精。',9:'妖洞前的连续敌潮，提前建立灵气产出，防守五条路线。',10:'蛇精拥有 1000 生命，每次哪吒火焰或穿山甲伏击最多对她造成 500 伤害。提前安排输出和技能。'};
 modal(`${game.cfg.name} · ${game.cfg.title}`,`<p>${tips[level]}</p><p>通关奖励：${game.cfg.reward?ALMANAC_CHARACTERS[game.cfg.reward].name+(ALMANAC_CHARACTERS[game.cfg.reward].implemented===false?'图鉴预告（后续开放）':''):'金币与关卡进度'}<br>点击卡片 → 点击空格；右键或 Esc 取消。</p>`,[{text:'开始守护',action:()=>{closeModal();paused=false;tone('plant');}}]);}
function paintPortrait(canvas,index){const paint=()=>{const r=rects[index],c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const h=canvas.height-3,w=h*r[2]/r[3];c.drawImage(sprites,...r,(canvas.width-w)/2,1,w,h);};if(sprites.complete&&sprites.naturalWidth)paint();else sprites.addEventListener('load',paint,{once:true});}
function paintCardPortrait(canvas,type){
 const specs={seven:{file:'seven-poses',rect:[80,90,400,600]},erwa:{file:'erwa-poses',rect:[55,90,430,600]},nezha:{file:'nezha-poses',rect:[150,115,310,500]},pangolin:{file:'pangolin-tall-poses',rect:[555,200,405,215]},tall:{file:'pangolin-tall-poses',rect:[105,400,315,420]},water:{file:'water-poses',rect:[80,90,355,480]},fire:{file:'fire-poses',rect:[85,90,360,480]},vine:{file:'support-poses',rect:[120,85,325,420]},wall:{file:'support-poses',rect:[130,516,300,365]}};
 const spec=specs[type],img=animationImages[spec.file];
 const paint=()=>{const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const h=Math.min(canvas.height,canvas.width*spec.rect[3]/spec.rect[2]),w=h*spec.rect[2]/spec.rect[3];c.drawImage(img,...spec.rect,(canvas.width-w)/2,0,w,h);};
 if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});
}
function makeCards(){$('#cards').replaceChildren();$('#cards').style.setProperty('--slots',save.slots);for(const type of game.cards){const c=CHARACTERS[type],el=document.createElement('button');el.className='card';el.dataset.type=type;el.setAttribute('aria-label',`${c.name}，${c.cost}灵气`);el.innerHTML=`<canvas class="portrait" width="140" height="130"></canvas><strong>${c.name}</strong><small class="card-cost">${c.cost}<span> 灵气</span></small><span class="cool"></span><span class="card-status"></span>`;paintCardPortrait(el.querySelector('canvas'),type);el.onclick=()=>select(type);$('#cards').append(el);}for(let i=$('#cards').children.length;i<save.slots;i++){const empty=document.createElement('div');empty.className='empty-slot';empty.setAttribute('aria-label',`空卡槽 ${i+1}`);empty.innerHTML='<span>待上阵</span>';$('#cards').append(empty);}}
function select(type){if(!game||paused||game.status!=='playing')return;const c=CHARACTERS[type];if(game.energy<c.cost){toast('灵气不足，点击场上的金色灵气球收集');return;}if(game.cooldowns[type]>0){toast('卡片冷却中，请稍候');return;}selected=selected===type?null:type;aimingId=null;shovel=false;updateHud();}
$('#shovel').onclick=()=>{if(!game||paused)return;shovel=!shovel;aimingId=null;selected=null;updateHud();};
$('#sound').onclick=()=>{muted=!muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;persist();if(!muted)tone('collect');};
function pause(){if(!game||game.status!=='playing'||!$('#modal').hidden)return;paused=true;const saved=checkpoint();modal('稍作休息',saved?'<p>战场已暂停并保存。</p>':'<p>战场已暂停，但保存失败。请勿关闭页面。</p>',[{text:'继续守护',action:()=>{closeModal();paused=false;}},{text:'保存战局',secondary:true,action:()=>checkpoint(true)},{text:'重新开始',secondary:true,action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:()=>modal('返回菜单？','<p>当前战局已保存，可从主菜单读取继续。</p>',[{text:'返回菜单',action:menu},{text:'继续守护',secondary:true,action:()=>{closeModal();paused=false;}}])}]);}
$('#pause').onclick=pause;
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function cell(p){return{row:Math.floor((p.y-GRID.y)/GRID.rh),col:Math.floor((p.x-GRID.x)/GRID.cw)};}
canvas.addEventListener('pointermove',e=>{hover=cell(point(e));});canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('pointerdown',e=>{if(e.button===2)return;if(!game||paused||game.status!=='playing')return;const p=point(e);const coin=[...game.coins].reverse().find(c=>Math.hypot(c.x-p.x,c.y-p.y)<30);if(coin){const value=game.collectCoin(coin.id);save.coins+=value;checkpoint();tone('collect');toast(`+${value} 金币`);updateHud();return;}const orb=[...game.orbs].reverse().find(o=>Math.hypot(o.x-p.x,o.y-p.y)<43);if(orb){game.collect(orb.id);tone('collect');updateHud();return;}const {row,col}=cell(p);if(row<0||row>4||col<0||col>8)return;if(!game.cfg.rows.includes(row)){toast('本关尚未开放这条路线');return;}if(shovel){if(game.remove(row,col))tone('plant');shovel=false;}else if(aimingId){if(game.castFire(aimingId,row,col)){tone('shoot');aimingId=null;}else{aimingId=null;toast('哪吒已释放或已退场');}}else if(selected){if(game.place(selected,row,col)){selected=null;tone('plant');}else toast('这里已有角色，或卡片暂不可用');}else{const actor=game.plants.find(p=>p.row===row&&p.col===col&&p.type==='nezha'&&!p.spent);if(actor&&actor.freezeLeft>0){toast('哪吒被冰封，解冻后才能施法');}else if(actor){aimingId=actor.id;toast('点击目标格，释放 3×3 火焰；右键取消');}}updateHud();});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();selected=null;shovel=false;aimingId=null;updateHud();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(selected||shovel||aimingId){selected=null;shovel=false;aimingId=null;updateHud();}else if(!$('#modal').hidden&&game&&game.status==='playing'){closeModal();paused=false;}else pause();}if(e.code==='Space'&&game&&$('#modal').hidden){e.preventDefault();pause();}if(e.key.toLowerCase()==='s'&&game&&!paused)$('#shovel').click();if(/^[1-9]$/.test(e.key)&&game&&!paused){const type=game.cards[+e.key-1];if(type)select(type);}});
window.addEventListener('pagehide',()=>checkpoint());
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&!game){save=readSave();refreshAdventure();}});
window.addEventListener('beforeunload',()=>checkpoint());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&!paused&&game.status==='playing')pause();});
function updateHud(){if(!game)return;$('#energy strong').textContent=game.energy;$('#wallet strong').textContent=save.coins.toLocaleString();for(const el of $('#cards').querySelectorAll('.card')){const type=el.dataset.type,c=CHARACTERS[type];el.classList.toggle('selected',selected===type);el.classList.toggle('unaffordable',game.energy<c.cost);el.classList.toggle('cooling',(game.cooldowns[type]||0)>0);el.querySelector('.card-status').textContent=game.cooldowns[type]>0?Math.ceil(game.cooldowns[type])+'秒':game.energy<c.cost?'灵气不足':'';el.setAttribute('aria-disabled',game.energy<c.cost||(game.cooldowns[type]||0)>0);el.querySelector('.cool').style.transform=`scaleY(${(game.cooldowns[type]||0)/c.cooldown})`;el.setAttribute('aria-pressed',selected===type);el.title=`${c.name} · ${c.cost} 灵气${game.cooldowns[type]>0?' · 冷却 '+Math.ceil(game.cooldowns[type])+' 秒':''}`;}$('#shovel').classList.toggle('active',shovel);$('#progressFill').style.width=`${100*game.spawned/game.cfg.schedule.length}%`;if(aimingId&&!game.plants.some(p=>p.id===aimingId&&!p.spent&&!(p.freezeLeft>0)))aimingId=null;$('#hint').textContent=aimingId?'点击目标区域中心，释放 3×3 火焰 · 右键取消':shovel?'点击角色将其移除 · 右键取消':selected?`已选择${CHARACTERS[selected].name} · 点击亮起的空格放置`:(game.level===1?'点击四娃卡片，再点击草地 · 点击金色灵气收集资源':'先种葫芦藤积累灵气，再部署四娃 · 右键取消选择');canvas.style.cursor=aimingId||shovel?'crosshair':selected?'copy':'default';}
// Source rectangles keep all art in the generated sprite atlas; enemy is mirrored to face left.
const rects=[[0,240,350,565],[440,235,305,565],[760,230,382,575],[1150,245,386,560]];
function sprite(index,x,y,w,h,{flip=false,angle=0,alpha=1}={}){const enemy=index===2;const img=enemy?frog:sprites;if(!img.complete||!img.naturalWidth)return;const r=enemy?[220,0,850,1245]:rects[index];if(enemy){w=106;h=155;flip=false;}ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);ctx.drawImage(img,...r,-w/2,-h,w,h);ctx.restore();}
function drawPose(name,x,y,{alpha=1,angle=0,scale=1,target=ctx,flash=false}={}){
 const pose=POSES[name],img=animationImages[pose.file];if(!img.complete||!img.naturalWidth)return;
 const [sx,sy,sw,sh]=pose.rect,s=pose.scale*scale;
 target.save();target.globalAlpha=alpha;target.translate(x,y);target.rotate(angle);if(flash)target.filter='brightness(1.35)';
 target.drawImage(img,sx,sy,sw,sh,(sx-pose.pivot[0])*s,(sy-pose.pivot[1])*s,sw*s,sh*s);target.restore();
}
function drawBookPreview(now){
 if(!bookPreview||$('#modal').hidden||!$('.book-art canvas'))return;
 const t=(now-bookPreview.start)/1000,art=$('.book-art canvas'),c=art.getContext('2d');c.clearRect(0,0,art.width,art.height);
 const id=bookPreview.id,active=(t%2.5)>.9;let name;
 if(id==='erwa')name=active?'erwaRelease':'erwaIdle';
 else if(id==='seven')name=t%6<1.5?'sevenIdle':t%6<3?'sevenAbsorb':'sevenRefine';
 else if(id==='nezha')name=active?'nezhaCast':'nezhaIdle';
 else if(id==='pangolin')name=t%5<1.5?'pangolinBuried':t%5<3.5?'pangolinReady':'pangolinTrigger';
 else if(id==='tall')name=active?'tallDefend':'tallIdle';
 else if(id==='water')name=active?((t%2.5)<1.2?'waterPrepare':'waterRelease'):'waterIdle';
 else if(id==='fire')name=active?((t%2.5)<1.2?'firePrepare':'fireRelease'):'fireIdle';
 else if(id==='vine')name=active?'vineProduce':'vineIdle';
 else if(id==='wall')name=active?'wallDefend':'wallIdle';
 else name=enemyPose({type:id,damaged:t%7>3.5,eating:active,attackClock:active?.4:0,phase:0},t);
 drawPose(name,110,256,{target:c,scale:id==='snake'?1.05:id==='bat'?1.25:['tall','nezha'].includes(id)?1.3:1.65});
}
function gourd(x,y,a=0){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.shadowColor='#ad762333';ctx.shadowBlur=7;ctx.fillStyle='#e9a52f';ctx.strokeStyle='#71451c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-24);ctx.bezierCurveTo(-54,-39,-56,40,-9,27);ctx.bezierCurveTo(5,24,5,12,18,16);ctx.bezierCurveTo(51,24,54,-22,22,-16);ctx.bezierCurveTo(8,-11,5,-20,-8,-24);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#5a682a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(39,-1);ctx.quadraticCurveTo(56,-24,60,-8);ctx.stroke();ctx.fillStyle='#ffdb72aa';ctx.beginPath();ctx.ellipse(-22,-9,10,6,-.4,0,7);ctx.fill();ctx.restore();}
function drawIce(x,y,remaining){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#99e4ff66';ctx.strokeStyle='#d4f7ff';ctx.lineWidth=3;ctx.shadowColor='#51caff';ctx.shadowBlur=10;
 ctx.beginPath();ctx.moveTo(-46,0);ctx.lineTo(-53,-85);ctx.lineTo(-28,-133);ctx.lineTo(29,-140);ctx.lineTo(52,-100);ctx.lineTo(46,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle='#ecffffa8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-28,-125);ctx.lineTo(-12,-76);ctx.lineTo(-38,-45);ctx.moveTo(-12,-76);ctx.lineTo(26,-92);ctx.moveTo(34,-130);ctx.lineTo(17,-33);ctx.lineTo(42,-9);ctx.stroke();
 ctx.fillStyle='#e4fbff';ctx.strokeStyle='#225c85';ctx.font='bold 20px KaiTi';ctx.textAlign='center';ctx.lineWidth=4;const label=`冰封 ${Math.ceil(remaining)}秒`;ctx.strokeText(label,0,-150);ctx.fillText(label,0,-150);ctx.restore();
}
function drawSpell(spell){
 const x=GRID.x+(spell.col+.5)*GRID.cw,y=GRID.y+(spell.row+.55)*GRID.rh;
 if(!spell.hit){const t=Math.min(1,spell.age/spell.delay),startY=GRID.y+(spell.fromRow+.35)*GRID.rh;
  const px=spell.fromX+(x-spell.fromX)*t,py=startY+(y-startY)*t-Math.sin(t*Math.PI)*95;
  ctx.save();ctx.shadowColor='#ff6c18';ctx.shadowBlur=24;ctx.fillStyle='#ff8c24';ctx.beginPath();ctx.arc(px,py,21,0,7);ctx.fill();ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(px+3,py-2,11,0,7);ctx.fill();ctx.restore();return;
 }
 const elapsed=spell.age-spell.delay,alpha=Math.max(0,1-elapsed/(spell.life-spell.delay));
 ctx.save();ctx.beginPath();ctx.rect(GRID.x,GRID.y,GRID.cw*9,GRID.rh*5);ctx.clip();
 if(spell.kind==='mine'){
  ctx.globalAlpha=alpha;ctx.strokeStyle='#eec77c';ctx.lineWidth=8;ctx.beginPath();ctx.ellipse(x,y,30+elapsed*120,10+elapsed*42,0,0,7);ctx.stroke();
  for(let i=0;i<12;i++){const angle=i*Math.PI/6;ctx.fillStyle=i%2?'#9c682d':'#d5ae67';ctx.beginPath();ctx.arc(x+Math.cos(angle)*elapsed*145,y-12+Math.sin(angle)*elapsed*85-elapsed*35,5+4*(i%3),0,7);ctx.fill();}
 }else{
  for(let r=Math.max(0,spell.row-1);r<=Math.min(4,spell.row+1);r++)for(let c=Math.max(0,spell.col-1);c<=Math.min(8,spell.col+1);c++){
   const tx=GRID.x+c*GRID.cw,ty=GRID.y+r*GRID.rh;ctx.globalAlpha=alpha*.6;ctx.fillStyle='#f47b2380';ctx.fillRect(tx+2,ty+2,GRID.cw-4,GRID.rh-4);
   for(let k=0;k<3;k++){const fx=tx+22+k*39,base=ty+GRID.rh-9,h=42+22*Math.sin(spell.age*15+r+c+k);ctx.globalAlpha=alpha;ctx.fillStyle=k%2?'#ffb334':'#f06b20';ctx.beginPath();ctx.moveTo(fx-15,base);ctx.quadraticCurveTo(fx-30,base-h*.45,fx+7,base-h);ctx.quadraticCurveTo(fx-3,base-h*.35,fx+17,base);ctx.closePath();ctx.fill();ctx.fillStyle='#ffe7a1';ctx.beginPath();ctx.ellipse(fx+1,base-12,7,17,0,0,7);ctx.fill();}
  }
 }
 ctx.restore();
}
function draw(){if(!game)return;ctx.clearRect(0,0,W,H);if(map.complete&&map.naturalWidth)ctx.drawImage(map,0,0,W,H);else{ctx.fillStyle='#7c9e62';ctx.fillRect(0,0,W,H);}for(let row=0;row<5;row++){if(!game.cfg.rows.includes(row)){ctx.fillStyle='#163b2f8f';ctx.fillRect(GRID.x,GRID.y+row*GRID.rh,GRID.cw*9,GRID.rh);ctx.fillStyle='#f0e4b8b0';ctx.font='22px KaiTi';ctx.textAlign='center';ctx.fillText('尚 未 开 放',GRID.x+GRID.cw*4.5,GRID.y+(row+.57)*GRID.rh);}}
 if(hover&&(selected||shovel)&&game.cfg.rows.includes(hover.row)&&hover.col>=0&&hover.col<9){
  const x=GRID.x+hover.col*GRID.cw,y=GRID.y+hover.row*GRID.rh,occupied=game.plants.some(p=>p.row===hover.row&&p.col===hover.col),valid=shovel?occupied:!occupied;
  ctx.save();ctx.fillStyle=valid?'#fff5b650':'#e35d3d55';ctx.fillRect(x+1,y+1,GRID.cw-2,GRID.rh-2);ctx.strokeStyle=valid?'#fff0a2':'#b94224';ctx.lineWidth=3;ctx.setLineDash([10,5]);ctx.strokeRect(x+3,y+3,GRID.cw-6,GRID.rh-6);ctx.restore();
  if(selected&&valid)drawPose(plantPose({type:selected,hp:CHARACTERS[selected].hp,timer:10}),x+GRID.cw/2,y+GRID.rh-7,{alpha:.6,scale:WORLD_SCALE[selected]});
 }
 if(hover&&aimingId&&game.cfg.rows.includes(hover.row)&&hover.col>=0&&hover.col<9){
  ctx.save();ctx.fillStyle='#ffad3a55';ctx.strokeStyle='#ffe098';ctx.lineWidth=3;
  for(let row=Math.max(0,hover.row-1);row<=Math.min(4,hover.row+1);row++)for(let col=Math.max(0,hover.col-1);col<=Math.min(8,hover.col+1);col++){const x=GRID.x+col*GRID.cw,y=GRID.y+row*GRID.rh;ctx.fillRect(x+2,y+2,GRID.cw-4,GRID.rh-4);ctx.strokeRect(x+3,y+3,GRID.cw-6,GRID.rh-6);}ctx.restore();
 }
 for(const m of game.mowers)if(game.cfg.rows.includes(m.row)&&(!m.used||m.active))gourd(m.x,GRID.y+(m.row+.55)*GRID.rh,m.active?game.time*13:0);
 const entities=[...game.plants.map(p=>({p,row:p.row,x:GRID.x+(p.col+.5)*GRID.cw})),...game.enemies.map(e=>({e,row:e.row,x:e.x}))].sort((a,b)=>a.row-b.row||a.x-b.x);
 for(const a of entities){
  const y=GRID.y+(a.row+1)*GRID.rh-7;
  ctx.save();ctx.shadowColor='#233b2b40';ctx.shadowBlur=8;ctx.fillStyle='#263f3040';ctx.beginPath();ctx.ellipse(a.x,y+1,a.p?.type==='vine'?34:42,8,0,0,7);ctx.fill();ctx.restore();
  if(a.p){const p=a.p;const recoil=p.hit>0?-3:0;drawPose(plantPose({...p,aiming:p.id===aimingId}),a.x+recoil,y+(p.freezeLeft>0?0:Math.sin(game.time*2+p.id)*1.2),{angle:p.hit>0?-.04:0,flash:p.hit>0,scale:WORLD_SCALE[p.type],alpha:p.spent?Math.min(1,p.retireLeft/.25):1});if(p.type==='seven'&&p.refineLeft>0&&!(p.freezeLeft>0)){ctx.fillStyle='#f1d6ff';ctx.strokeStyle='#59347b';ctx.lineWidth=3;ctx.font='bold 17px KaiTi';ctx.textAlign='center';const text=`炼化 ${Math.ceil(p.refineLeft)}秒`;ctx.strokeText(text,a.x,y-100);ctx.fillText(text,a.x,y-100);}if(p.type==='nezha'&&!p.spent&&!(p.freezeLeft>0)){ctx.fillStyle='#fff0a1';ctx.strokeStyle='#68401d';ctx.lineWidth=3;ctx.font='bold 16px KaiTi';ctx.textAlign='center';ctx.strokeText(p.id===aimingId?'指定目标':'点击施法',a.x,y-145);ctx.fillText(p.id===aimingId?'指定目标':'点击施法',a.x,y-145);}if(p.type==='pangolin'&&!p.spent&&!(p.freezeLeft>0)){ctx.fillStyle=p.armed?'#f7eea5':'#e8d4aa';ctx.font='15px KaiTi';ctx.textAlign='center';ctx.fillText(p.armed?'就绪':Math.ceil(p.armLeft)+'秒',a.x,y-52);}if(p.freezeLeft>0)drawIce(a.x,y,p.freezeLeft);}
  else{const e=a.e;const sway=Math.sin(game.time*(e.slowLeft>0?3:6)+(e.phase||0));drawPose(enemyPose(e,game.time),e.x+(e.hit>0?4:0),y-(e.type==='bat'?38+Math.sin(game.time*6+(e.phase||0))*7:e.eating?0:Math.abs(sway)*2),{angle:e.hit>0?.045:0,flash:e.hit>0,scale:['bat','snake'].includes(e.type)?1:WORLD_SCALE.frog});if(e.slowLeft>0){ctx.save();ctx.strokeStyle='#8cddf0';ctx.lineWidth=3;ctx.shadowColor='#38bfff';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(e.x,y-3,39,9,0,0,7);ctx.stroke();ctx.fillStyle='#a7efff';ctx.font='bold 20px KaiTi';ctx.textAlign='center';ctx.fillText('缓',e.x+42,y-72);ctx.restore();}}
 }
 for(const body of game.corpses){const y=GRID.y+(body.row+1)*GRID.rh-7;const fall=Math.min(1,body.age/.65);drawPose(body.type==='snake'?'snakeIdle':body.type==='bat'?'batFlyB':'corpse',body.x,body.type==='bat'?y-38+Math.min(38,body.age*90):y,{angle:-Math.PI*.48*fall,alpha:Math.min(1,(body.life-body.age)/.45),scale:['bat','snake'].includes(body.type)?1:WORLD_SCALE.frog});}
 for(const part of game.debris){const head=part.kind==='head',t=part.age;const floor=GRID.y+(part.row+1)*GRID.rh-7;const start=head?-80:-22;const ballistic=start-(head?180:130)*t+320*t*t;const bounce=ballistic>0?-(head?8:4)*Math.abs(Math.sin((t-.7)*8))*Math.max(0,1.4-t):ballistic;drawPose(part.kind,part.x+(head?-48:38)*Math.min(t,1.2),floor+bounce,{angle:(head?-1.9:1.4)*Math.min(t,1.4),alpha:Math.min(1,(part.life-t)/.5),scale:WORLD_SCALE.frog});}
 for(const b of game.bullets){const y=GRID.y+(b.row+.45)*GRID.rh-(b.lift||0);ctx.save();if(b.kind==='gold'){ctx.shadowColor='#ffe265';ctx.shadowBlur=18;const glow=ctx.createRadialGradient(b.x,y,2,b.x,y,18);glow.addColorStop(0,'#fffde0');glow.addColorStop(.45,'#ffe67a');glow.addColorStop(1,'#dca52b');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(b.x,y,18,10,0,0,7);ctx.fill();ctx.strokeStyle='#fff5ad99';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-18,y);ctx.lineTo(b.x-39,y);ctx.stroke();}else if(b.kind==='water'){ctx.shadowColor='#35c5f7';ctx.shadowBlur=12;const g=ctx.createRadialGradient(b.x-4,y-4,1,b.x,y,17);g.addColorStop(0,'#f0ffff');g.addColorStop(.35,'#9feaff');g.addColorStop(1,'#1785d4');ctx.fillStyle=g;ctx.strokeStyle='#c3f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,y,17,13,0,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle='#75d7f780';ctx.beginPath();ctx.moveTo(b.x-20,y);ctx.lineTo(b.x-35,y+2);ctx.stroke();}else{ctx.shadowColor='#ff6e16';ctx.shadowBlur=16;ctx.fillStyle='#ea4e15';ctx.beginPath();ctx.moveTo(b.x-27,y-8);ctx.quadraticCurveTo(b.x-5,y-1,b.x-24,y+10);ctx.quadraticCurveTo(b.x+27,y+19,b.x+16,y);ctx.quadraticCurveTo(b.x+13,y-17,b.x-27,y-8);ctx.fill();ctx.fillStyle='#fff195';ctx.beginPath();ctx.ellipse(b.x+5,y,9,6,0,0,7);ctx.fill();}ctx.restore();}
 for(const spell of game.spells)drawSpell(spell);
 for(const f of game.effects){if(f.kind==='absorb'){const t=1-f.life/.6;ctx.save();ctx.translate(f.x+(f.toX-f.x)*t,f.y+(f.toY-f.y)*t);ctx.strokeStyle='#be8aff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,36*(1-t)+6,22*(1-t)+4,t*10,0,7);ctx.stroke();drawPose('frogWalkA',0,30*(1-t),{scale:.8*(1-t),alpha:1-t,angle:t*6});ctx.restore();continue;}ctx.fillStyle=f.kind==='water'?`rgba(100,218,255,${f.life*3})`:`rgba(255,210,91,${f.life*3})`;ctx.beginPath();ctx.arc(f.x,f.y,28*(1-f.life),0,7);ctx.fill();}
 for(const coin of game.coins){ctx.save();ctx.translate(coin.x,coin.y);ctx.globalAlpha=Math.min(1,coin.life/2);ctx.fillStyle=coin.value===50?'#efbf3d':'#d4dcd7';ctx.strokeStyle=coin.value===50?'#93601d':'#677b75';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,21,25,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#6b572b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 17px Georgia';ctx.fillText(coin.value,0,1);ctx.restore();}
 for(const o of game.orbs){ctx.save();ctx.translate(o.x,o.y);ctx.globalAlpha=o.life<2?o.life/2:1;ctx.rotate(game.time*.25);ctx.shadowColor='#fff379';ctx.shadowBlur=26;ctx.fillStyle='#f8bf38';ctx.strokeStyle='#fff6a8';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?25:36;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#ffec92';ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.fill();ctx.fillStyle='#ae741b';ctx.font='bold 22px KaiTi';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('灵',0,1);ctx.restore();}
 if(game.time<waveUntil){ctx.save();ctx.textAlign='center';ctx.font='bold 58px KaiTi';ctx.strokeStyle='#fbe6b1';ctx.lineWidth=7;ctx.strokeText('一大波妖怪正在接近！',W/2,H*.47);ctx.fillStyle='#a3211e';ctx.fillText('一大波妖怪正在接近！',W/2,H*.47);ctx.restore();}}
function finish(){
 if(ended)return;ended=true;paused=true;selected=null;aimingId=null;
 if(game.status==='won'){
  const earnings=victoryCoins(game);save.coins+=earnings;game.coins=[];
  save.completed=Math.max(save.completed,game.level);save.updatedAt=new Date().toISOString();save.battle=null;persist();
  const c=ALMANAC_CHARACTERS[game.cfg.reward],next=game.level+1;
  modal('守护成功！',`${c?`<canvas class="reward" width="220" height="260" aria-label="${c.name}"></canvas><p>${c.implemented===false?'获得角色预告：':'获得新角色：'}<b>${c.name}</b><br>${roleNotes[game.cfg.reward].description}</p>`:`<p>${game.level===10?'蛇精已被击退，葫芦藤园重归安宁。':'守住了这一波妖怪，继续向蛇精的洞府前进。'}</p>`}<p>${game.cfg.name} 已完成 · 击退 ${game.kills} 只妖怪<br>本关结算 +${earnings} 金币 · 钱袋 ${save.coins} 金币<br>进度已自动保存</p>`,[{text:LEVELS[next]?`进入 1-${next}`:'第一章完成',action:()=>LEVELS[next]?start(next):menu()},{text:'重玩本关',secondary:true,action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:menu}]);
  const art=$('canvas.reward');if(!c)return;if(c.pose){const paint=()=>drawPose(c.pose,110,247,{target:art.getContext('2d'),scale:c.name==='大娃'?1.25:1.5});const img=animationImages[POSES[c.pose].file];if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}else paintPortrait(art,c.sprite);
 }else modal('妖怪闯进了藤园','<p>试着多种葫芦藤积累灵气，<br>用三娃保护后排，并及时使用范围技能。</p>',[{text:'重新挑战',action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:menu}]);
}
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(game){if(!paused){advanceBattle(game,dt,speed);for(const e of game.events.splice(0)){if(e.type==='freeze')toast('蛇精施展冰封！');if(e.type==='wave')waveUntil=game.time+4;if(['shoot','collect','mower','won','lost','cast','blast','mine'].includes(e.type))tone(e.type);}if(game.status!=='playing')finish();else if(game.time-lastAutoSave>=10)checkpoint();updateHud();}draw();}drawBookPreview(now);requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Explicit QA flag: deterministic engine access for browser integration tests, absent in normal sessions.
if(new URLSearchParams(location.search).has('qa'))window.__qa={get game(){return game;},start,select,get paused(){return paused;},get save(){return save;},freeze(value=true){paused=value;},render:draw,step(seconds){if(!game||paused)return;for(let t=0;t<seconds&&game.status==='playing';t+=.05)game.step(.05);if(game.status!=='playing')finish();else if(game.time-lastAutoSave>=10)checkpoint();updateHud();draw();}};
