import {DAILY_REWARDS,canClaimDaily,claimDaily} from './checkin.js';
import {advanceBattle} from './timing.js';
import {initDesktopUpdates} from './desktop-updates.js';
import {SLOT_PRICES,buySlot,victoryCoins,BLACKCAT_PRICE,buyBlackcat,WUKONG_PRICE,buyWukong} from './economy.js';
import {Game,GRID,CHARACTERS,LEVELS,MONSTERS,monsterScale,isCharmed} from './engine.js';
import {LAST_LEVEL,adventureLevel} from './levels.js';
import {POSES,WORLD_SCALE,plantPose,enemyPose} from './animation.js';
import {ALMANAC_CHARACTERS,isCharacterUnlocked} from './roster.js';
import {SAVE_KEY,emptySave,decodeSave,decodeSaveProgress,encodeSave,snapshotGame,restoreGame} from './storage.js';
const $=s=>document.querySelector(s), canvas=$('#board'),ctx=canvas.getContext('2d'),W=1672,H=941;
const map=new Image(),sprites=new Image();map.src='assets/maps/chapter-01-wood-clean-v2.png';sprites.src='assets/sprites/characters-clean.png';
const caveMap=new Image();caveMap.src='assets/maps/chapter-02-snake-cave-v1.png';
const frog=new Image();frog.src='assets/sprites/frog-trident.png';
const animationImages=Object.fromEntries([...new Set(Object.values(POSES).map(p=>p.file))].map(file=>{const img=new Image();img.src=`assets/animation/${file}.png`;return[file,img];}));
let bookPreview=null;
let game=null,selected=null,shovel=false,paused=false,last=0,hover=null,muted=false,audio=null,toastTimer,waveUntil=0,ended=false,aimingId=null;
let storageIssue=false,battleIssue=false,lastAutoSave=0,speed=1;
function readSave(){
 try{const raw=localStorage.getItem(SAVE_KEY);const result=raw?decodeSave(raw):emptySave();storageIssue=false;battleIssue=false;return result;}
 catch{
  // Keep progress when only the battle snapshot is broken, and never overwrite the unreadable file.
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw){const partial=decodeSaveProgress(raw);storageIssue=false;battleIssue=true;return partial;}}
  catch{}
  storageIssue=true;battleIssue=false;return emptySave();
 }
}
let save=readSave();muted=save.settings.muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;refreshAdventure();
function refreshAdventure(){speed=save.settings.speed??1;$('#battleSpeed').value=speed;$('#battleSpeed').setAttribute('aria-valuetext',`${speed}倍速`);$('#speedLabel').textContent=`${speed}×`;$('.menu-coins').textContent=`${save.coins.toLocaleString()} 金币`;$('#wallet strong').textContent=save.coins.toLocaleString();$('.checkin-button small').textContent=save.checkin?.claimed===7?'七日已领完':canClaimDaily(save)?'今日可领取':'今日已签到';const name=LEVELS[adventureLevel(save)].name;$('.stage-number').textContent=name;$('.adventure').setAttribute('aria-label',`闯关模式${name}`);}
function persist(){try{if(storageIssue)return false;save.settings={muted,speed};localStorage.setItem(SAVE_KEY,encodeSave(save));refreshAdventure();return true;}catch{toast('保存失败：浏览器存储不可用或存档数据无效');return false;}}
function checkpoint(notify=false){if(!game||game.status!=='playing')return false;save.battle=snapshotGame(game);save.updatedAt=new Date().toISOString();const ok=persist();if(ok){lastAutoSave=game.time;if(notify)toast('战局已保存，可以从主菜单读取继续');}return ok;}
function resumeBattle(){try{const restored=restoreGame(save.battle);game=restored;selected=null;shovel=false;paused=true;ended=false;lastAutoSave=game.time;waveUntil=0;aimingId=null;$('#menu').hidden=true;$('#play').hidden=false;$('#levelLabel').textContent=`${game.cfg.region}　${game.cfg.name}`;makeCards();updateHud();draw();modal('战局已恢复',`<p>${game.cfg.name} · 已进行 ${Math.floor(game.time)} 秒<br>灵气 ${game.energy} · 场上 ${game.plants.length} 个角色</p>`,[{text:'继续守护',action:()=>{closeModal();paused=false;}},{text:'返回菜单',secondary:true,action:menu}]);}catch{toast('无法恢复这个战局，现有存档未被覆盖');}}
function openSaveMenu(){
 save=readSave();refreshAdventure();const issue=storageIssue;
 const summary=issue?'存档无法读取，可导入之前导出的备份。':save.battle?`可恢复战局：${LEVELS[save.battle.level].name} · ${Math.floor(save.battle.time)} 秒 · ${save.battle.energy} 灵气`:save.completed?'已保存通关进度，暂无进行中的战局。':'暂无存档，开始游戏后可手动或自动保存。';
 const buttons=[];if(save.battle)buttons.push({text:'继续保存的战局',action:resumeBattle});else if(save.completed)buttons.push({text:save.completed>=LAST_LEVEL?`重玩 ${LEVELS[LAST_LEVEL].name}`:`继续 ${LEVELS[save.completed+1].name}`,action:()=>start(Math.min(save.completed+1,LAST_LEVEL))});
 else if(!issue)buttons.push({text:'开始 1-1',action:enterAdventure});
 if(save.battle||save.completed)buttons.push({text:'导出存档',secondary:true,action:()=>{const blob=new Blob([encodeSave(save)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='葫芦山存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});
 buttons.push({text:'导入存档',secondary:true,action:()=>$('#saveImport').click()},{text:'返回菜单',secondary:true,action:closeModal});
 const current=adventureLevel(save),date=save.updatedAt?new Date(save.updatedAt):null;
 const updated=date&&!Number.isNaN(date.getTime())?date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'暂无记录';
 const unlocked=['fire','vine','wall','nezha','pangolin','tall','water','seven','erwa','six','blackcat','wukong','beta','shuke'].filter(id=>isCharacterUnlocked(id,save.completed,save.unlocks)).map(id=>ALMANAC_CHARACTERS[id].name).join('、');
 const progress=Object.entries(LEVELS).map(([key,cfg])=>{const level=Number(key),done=save.completed>=level,active=level===current;return `<li class="${done?'done ':''}${active?'current':''}"><strong>${cfg.name}</strong><small>${active?(done?'可重玩':'当前'):done?'已通关':'未解锁'}</small></li>`;}).join('');
 modal('存档与关卡进度',`<div class="save-current"><span>当前关卡</span><strong>${LEVELS[current].name}</strong><span>${LEVELS[current].title}</span></div><ol class="save-progress" aria-label="关卡进度">${progress}</ol><p class="save-summary">${summary}</p><dl class="save-details"><dt>已通关</dt><dd>${save.completed} / ${LAST_LEVEL} 关${save.completed?`（1-1 ～ ${LEVELS[save.completed].name}）`:''}</dd><dt>已解锁角色</dt><dd>${unlocked}</dd><dt>金币与卡槽</dt><dd>${save.coins.toLocaleString()} 金币 · ${save.slots} 个卡槽</dd><dt>最近保存</dt><dd>${updated}</dd></dl><p class="save-help">每 10 秒自动保存；暂停、返回菜单时也会保存。</p>`,buttons);
 $('#modal').classList.add('save-modal');
}
$('#saveImport').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>1000000)throw Error();const imported=decodeSave(await file.text());const raw=encodeSave(imported);localStorage.setItem(SAVE_KEY,raw);save=imported;muted=save.settings.muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;openSaveMenu();toast('存档导入成功');}catch{toast('导入失败：文件无效，原存档已保留');}});
$('#battleSpeed').addEventListener('input',e=>{speed=Number(e.target.value);$('#speedLabel').textContent=`${speed}×`;e.target.setAttribute('aria-valuetext',`${speed}倍速`);persist();});
$('#saveBattle').onclick=()=>checkpoint(true);
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function tone(type){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type==='shoot'?'triangle':'sine';o.frequency.setValueAtTime(({plant:280,shoot:180,collect:820,won:660,lost:100,mower:90,kill:130})[type]||360,audio.currentTime);o.frequency.exponentialRampToValueAtTime(type==='collect'?1200:80,audio.currentTime+.12);g.gain.setValueAtTime(type==='shoot'?.016:.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.18);}catch{}}
function modal(title,body,buttons){$('#modal').classList.remove('book-modal','book-index','save-modal','shop-modal','loadout-modal','checkin-modal');$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalButtons').replaceChildren();for(const b of buttons){const el=document.createElement('button');el.textContent=b.text;if(b.secondary)el.className='secondary';el.disabled=!!b.disabled;el.onclick=b.action;$('#modalButtons').append(el);}$('#modal').hidden=false;}
function closeModal(){$('#modal').hidden=true;bookPreview=null;}
function menu(){checkpoint();aimingId=null;game=null;paused=false;ended=false;$('#play').hidden=true;$('#menu').hidden=false;closeModal();refreshAdventure();}
function enterAdventure(){save=readSave();refreshAdventure();if(save.battle){resumeBattle();closeModal();paused=false;}else start(adventureLevel(save));}
$('.adventure').onclick=enterAdventure;
function openShop(chosen=null,tab='slots'){
 save=readSave();refreshAdventure();const recruit=tab==='roles',catalog={blackcat:{price:BLACKCAT_PRICE,buy:buyBlackcat,detail:'225 灵气 · 双发追踪弹 · 直接部署于草地',hint:'飞行目标优先，无需荷叶'},wukong:{price:WUKONG_PRICE,buy:buyWukong,detail:'300 灵气 · 每 5 秒投棒 · 命中后持续 5 秒',hint:'每秒 50 伤害，金箍棒命中后留在原地旋转'}},recruitId=recruit&&catalog[chosen]?chosen:'blackcat',product=catalog[recruitId],recruitName=CHARACTERS[recruitId].name,next=save.slots+1,slot=chosen??Math.min(next,10),price=recruit?product.price:SLOT_PRICES[slot],owned=recruit?save.unlocks[recruitId]:slot<=save.slots,eligible=recruit||slot===next;
 const description=owned?(recruit?`${recruitName}已经加入，开局选角时就能带上他！`:'这个卡槽已经装好了，孩子们可以带上更多伙伴啦！'):!eligible?`先把卡栏扩到 ${slot-1} 槽，再来看看这件吧。`:save.coins>=price?'金币攒够啦！选好商品，就能让守护葫芦山的队伍更强大。':`再攒 ${(price-save.coins).toLocaleString()} 金币，就能${recruit?'招募'+recruitName:'多带一位伙伴'}。`;
 const goods=recruit?Object.entries(catalog).map(([id,c])=>`<button class="shop-product ${id===recruitId?'chosen':''} ${save.unlocks[id]?'owned':''}" data-recruit="${id}" aria-label="${CHARACTERS[id].name}招募" aria-pressed="${id===recruitId}"><canvas class="recruit-art" width="180" height="180" data-recruit-art="${id}"></canvas><strong>${CHARACTERS[id].name}</strong><span class="price-tag">${c.price.toLocaleString()} 金币</span><small>${save.unlocks[id]?'已招募':'永久解锁'}</small></button>`).join(''):Object.entries(SLOT_PRICES).map(([key,cost])=>`<button class="shop-product ${+key===slot?'chosen':''} ${+key<=save.slots?'owned':''}" data-slot="${key}" aria-label="${key}个卡槽" aria-pressed="${+key===slot}"><div class="tray-product">${Array.from({length:+key},()=>'<i></i>').join('')}</div><strong>${key} 个卡槽</strong><span class="price-tag">${cost.toLocaleString()} 金币</span><small>${+key<=save.slots?'已购':+key===next?'可升级':'待解锁'}</small></button>`).join('');
 modal('爷爷的杂货铺',`<div class="stall-title">爷爷的杂货铺<small>葫芦山 · 行脚货摊</small></div><div class="shop-balance">钱袋 <b>${save.coins.toLocaleString()}</b><small>金币</small></div><div class="shop-dialogue">${description}</div><div class="shop-tabs" role="tablist" aria-label="商店分类"><button role="tab" data-shop-tab="slots" aria-selected="${!recruit}">卡槽补给</button><button role="tab" data-shop-tab="roles" aria-selected="${recruit}">伙伴招募</button></div><div class="shop-items ${recruit?'recruit-items':''}">${goods}</div><div class="shop-description"><strong>${recruit?recruitName+(recruitId==='wukong'?' · 金箍棒持续攻击':' · 全场追踪射击'):slot+' 槽角色卡栏'}</strong><span>${recruit?product.detail:`可携带 ${slot} 位角色上阵 · 永久扩充`}</span><small>${recruit?product.hint:`当前 ${save.slots} 槽 / 最多 10 槽 · 点击货架上的商品查看`}</small></div>`,[{text:owned?(recruit?'已经招募':'已经购买'):!eligible?'请先购买前一槽':save.coins<price?`金币不足 · 还差 ${(price-save.coins).toLocaleString()}`:`购买 · ${price.toLocaleString()} 金币`,disabled:owned||!eligible||save.coins<price,action:()=>{const before={...save};if(recruit?product.buy(save):buySlot(save)){save.updatedAt=new Date().toISOString();if(persist()){openShop(recruit?recruitId:null,tab);toast(recruit?`${recruitName}已加入伙伴队伍！`:`已扩充到 ${save.slots} 个卡槽`);}else save=before;}}},{text:'返回菜单',secondary:true,action:closeModal}]);
 $('#modal').classList.add('shop-modal');for(const button of document.querySelectorAll('[data-slot]'))button.onclick=()=>openShop(Number(button.dataset.slot));for(const button of document.querySelectorAll('[data-shop-tab]'))button.onclick=()=>openShop(null,button.dataset.shopTab);for(const button of document.querySelectorAll('[data-recruit]'))button.onclick=()=>openShop(button.dataset.recruit,'roles');for(const art of document.querySelectorAll('[data-recruit-art]'))paintAlmanacArt(art,art.dataset.recruitArt,true);
}
$('.shop-button').onclick=()=>openShop();

function openCheckin(){
 save=readSave();refreshAdventure();const count=save.checkin.claimed,available=canClaimDaily(save),heroId=count<2?'beta':'shuke',heroDay=heroId==='beta'?2:4,heroName=CHARACTERS[heroId].name;
 const days=DAILY_REWARDS.map((reward,i)=>`<article class="daily-reward ${i<count?'claimed':i===count?'next':''} ${reward.character?'special':''}"><span>第 ${i+1} 天</span><b class="daily-icon">${reward.character?'★':'◉'}</b><strong>${reward.character?CHARACTERS[reward.character].name:reward.coins.toLocaleString()+' 金币'}</strong><small>${i<count?'已领取':i===count?(available?'今日可领':'明日可领'):reward.character?'永久角色':'累计签到奖励'}</small></article>`).join('');
 modal('七日签到 · 伙伴来报到',`<div class="checkin-layout"><aside class="daily-hero"><span>第 ${heroDay} 天领取</span><canvas width="420" height="420" aria-label="${heroName}签到奖励"></canvas><h2>${heroName} · ${heroId==='beta'?'坦克支援':'直升机支援'}</h2><p>${heroId==='beta'?'全场索敌 · 密集区域炮击':'渔网 / 石头 / 毒蘑菇'}<br>累计签到第 ${heroDay} 天永久加入</p></aside><section class="daily-calendar"><p class="daily-progress">已签到 <b>${count} / 7</b> 天 · ${save.coins.toLocaleString()} 金币</p><div class="daily-grid">${days}</div><p class="daily-rules">每日按北京时间 00:00 更新领取资格。累计七天，漏签不重置；本期七日奖励每份仅能领取一次。签到进度随本机存档保存。</p></section></div>`,[{text:count===7?'七日奖励已全部领取':available?`领取第 ${count+1} 天奖励`:'今日已签到 · 明日再来',disabled:!available,action:()=>{const before=structuredClone(save),reward=claimDaily(save);if(!reward){openCheckin();return;}save.updatedAt=new Date().toISOString();if(persist()){openCheckin();toast(reward.character?CHARACTERS[reward.character].name+'已加入！开局选角时可上阵':'签到成功，获得 '+reward.coins.toLocaleString()+' 金币');}else save=before;}},{text:'返回菜单',secondary:true,action:closeModal}]);
 $('#modal').classList.add('checkin-modal');paintAlmanacArt($('.daily-hero canvas'),heroId,true);
}
$('.checkin-button').onclick=openCheckin;

const roleNotes={
 shuke:{unlock:'累计签到第 4 天领取 · 永久解锁',description:'驾驶红色直升机，200 灵气、300 耐久，每 4 秒飞到本行最靠前的妖怪上方向下投掷一次。40% 渔网：造成与四娃火焰弹相同的 20 点伤害，并让本行两格范围内妖怪无法移动、攻击或施法 4 秒；40% 石头：单体 50 伤害并向右击退半格；20% 毒蘑菇：单体魅惑 10 秒，妖怪转向攻击同路敌人，结束后恢复敌方。地面与飞行妖怪均可命中，己方不会攻击被魅惑的妖怪；地面近战无法攻击空中的舒克。'},
 beta:{unlock:'累计签到第 2 天领取 · 永久解锁',description:'驾驶蓝色坦克进行全场支援。部署后准备 20 秒，自动向妖怪最密集的 3×3 区域发射炮弹，每次造成 300 点范围伤害，可命中地面与飞行妖怪。每次发射后重新装填 20 秒；没有目标时保持待命，冰封会暂停装填。'},
 wukong:{unlock:'商店伙伴招募 · 20,000 金币永久解锁',description:'原创玩法。每 5 秒向本行前方投掷金箍棒；击中后金箍棒停留原地 5 秒，每秒对附近同路妖怪造成 50 点伤害，共结算 5 次。目标被击败后金箍棒仍保留，不同金箍棒可叠加伤害。'},
 blackcat:{unlock:'商店伙伴招募 · 10,000 金币永久解锁',description:'对应猫尾草。直接放置在普通草地，无需荷叶。全场索敌，优先飞行妖怪；每轮射出两枚追踪子弹，每枚 20 点伤害。目标被击败后子弹会重新索敌。'},
 six:{unlock:'通关 1-10 解锁，2-1 起及重玩关卡可选用',description:'对应窝瓜。半透明隐身待命，无需准备时间，附近地面妖怪靠近时跃起重击目标附近的小范围，使用一次后退场。无法攻击蝙蝠精；对蛇精每次最多造成 500 伤害。'},
 nezha:{unlock:'通关 1-3 解锁，1-4 起可用',description:'对应樱桃炸弹。放置后可以等待，点击场上的哪吒，再点击草坪指定 3×3 区域释放火焰。附近出现妖怪时立即对自身周围 3×3 自动释放；使用一次后退场。'},
 pangolin:{unlock:'通关 1-4 解锁，1-5 起可用',description:'对应土豆地雷。种下后埋伏地下，14 秒后探头待命；同一行妖怪靠近时触发一次范围攻击，随后退场。未准备好时仍会受到攻击。'},
 tall:{unlock:'通关 1-5 解锁，1-6 起可上阵',description:'对应高坚果。身形高大、耐久更高，抵挡妖怪。可在开局选角时加入阵容，与三娃形成不同的防御选择。'},water:{unlock:'通关 1-6 解锁，1-7 起可用',description:'对应寒冰射手。发射蓝色水弹，造成 20 点伤害，使妖怪移动和近身攻击节奏减半，持续 10 秒；再次命中刷新时间，不叠加减速。'},erwa:{unlock:'通关 1-8 解锁，1-9 起可用',description:'对应双发射手。每轮连续发射两枚金光弹，每枚 20 点伤害，可攻击本行地面和飞行妖怪。'},seven:{unlock:'通关 1-7 解锁，1-8 起可用',description:'对应食人花。使用宝葫芦吸收本行前方近距离的单个妖怪，随后抱住葫芦炼化 42 秒，期间不能再次吸收。可吸收本行前方一格内的地面普通妖怪；无法吸收蝙蝠精或蛇精。'},fire:{unlock:'初始角色',description:'向本行前方吐出火焰弹，造成单体伤害。青蛙精进入草坪后才开始攻击。'},vine:{unlock:'通关 1-1 解锁',description:'首次种下 8 秒后产出灵气，此后每 24 秒产出一次，每次 25 灵气。点击灵气球收集。'},wall:{unlock:'通关 1-2 解锁',description:'铜头铁臂，阻挡妖怪并承受近身攻击。本版通关后解锁，后续关卡可上阵。'}};
function paintAlmanacArt(art,id,isRole,name=null,formScale=1){
 const c=art.getContext('2d'),poseName=name??(isRole?(ALMANAC_CHARACTERS[id].pose??plantPose({type:id,hp:ALMANAC_CHARACTERS[id].hp,timer:10})):enemyPose({type:id},0)),pose=POSES[poseName],img=animationImages[pose.file];
 const paint=()=>{c.clearRect(0,0,art.width,art.height);const [sx,sy,sw,sh]=pose.rect,s=pose.scale,fit=Math.min((art.width-16)/(sw*s),(art.height-14)/(sh*s))*formScale;const x=(art.width-sw*s*fit)/2-(sx-pose.pivot[0])*s*fit,y=art.height-7-(sy+sh-pose.pivot[1])*s*fit;drawPose(poseName,x,y,{target:c,scale:fit});};
 if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});
}
function openAlmanac(category='index',id=category==='roles'?'fire':'frog'){
 if(category==='index'){
  modal('葫芦山图鉴',`<div class="almanac-index"><p>万物有灵 · 知己知彼</p><div class="index-options"><button data-open-book="roles" aria-label="查看角色图鉴"><div class="index-gallery">${['fire','vine','seven'].map(id=>`<canvas width="150" height="190" data-index-art="${id}" data-role="true"></canvas>`).join('')}</div><h2>角色图鉴</h2><span>十四位伙伴 · 各显神通</span></button><button data-open-book="monsters" aria-label="查看妖怪图鉴"><div class="index-gallery">${['frog','bat','snake','scorpion','centipede'].map(id=>`<canvas width="150" height="190" data-index-art="${id}"></canvas>`).join('')}</div><h2>妖怪图鉴</h2><span>五种妖怪 · 来势汹汹</span></button></div><div class="index-footnote">翻开图鉴，了解伙伴的本领与妖怪的弱点。</div></div>`,[{text:'关闭图鉴',secondary:true,action:closeModal}]);
  $('#modal').classList.add('book-modal','book-index');for(const button of document.querySelectorAll('[data-open-book]'))button.onclick=()=>openAlmanac(button.dataset.openBook);for(const art of document.querySelectorAll('[data-index-art]'))paintAlmanacArt(art,art.dataset.indexArt,!!art.dataset.role);return;
 }

 save=readSave();const isRole=category==='roles',entries=(isRole?['vine','fire','wall','nezha','pangolin','tall','water','seven','erwa','six','blackcat','wukong','beta','shuke']:['frog','bat','snake','scorpion','centipede']).map(id=>[id,(isRole?ALMANAC_CHARACTERS:MONSTERS)[id]]),item=(isRole?ALMANAC_CHARACTERS:MONSTERS)[id],notes=roleNotes[id];
 const unlocked=!isRole||isCharacterUnlocked(id,save.completed,save.unlocks);
 const details=isRole?[
  ['放置消耗',`${item.cost} 灵气`],['生命值',item.hp],['卡片冷却',`${item.cooldown} 秒`],
  ...(item.role==='airdrop'?[['投掷间隔',`${item.interval} 秒`],['渔网 · 40%','20 伤害 · 两格控制 4 秒'],['石头 · 40%','50 伤害 · 击退半格'],['毒蘑菇 · 20%','魅惑单个妖怪 10 秒']]:[]),
  ...(item.role==='artillery'?[['炮击伤害',`${item.damage} / 3×3 区域`],['装填时间',`${item.interval} 秒`],['索敌范围','全场 · 密集区域优先']]:[]),
  ...(item.role==='staff'?[['投掷间隔',`${item.interval} 秒`],['持续伤害',`${item.damage} / 秒`],['停留时间',`${item.duration} 秒`]]:[]),
  ...(item.role==='shooter'?[['攻击伤害',`${item.damage} / 发${item.burstCount?' · 每轮两发':''}`],['攻击间隔',`${item.interval} 秒`],...(item.globalTarget?[['索敌范围','全场 · 飞行优先']]:[])]:[]),
  ...(item.slowDuration?[['减速效果',`50% · ${item.slowDuration} 秒`]]:[]),
  ...(item.role==='producer'?[['资源产出','25 灵气 / 次']]:[]),
  ...(item.role==='absorber'?[['定位','近距离单体吸收'],['炼化时间',`${item.refineTime} 秒`]]:[]),
  ...(item.role==='caster'?[['技能伤害',item.damage],['作用范围','3 × 3 格']]:[]),
  ...(item.role==='ambusher'?[['突袭伤害',item.damage],['攻击范围','本行近距离'],['准备时间','立即待命']]:[]),
  ...(item.role==='mine'?[['准备时间',`${item.armTime} 秒`],['触发伤害',item.damage]]:[]),
  ...(item.role==='wall'?[['定位','防御阻挡']]:[])
 ]:[['生命值',item.hp],['行动方式',item.flying?'飞行 · 越过地面阻挡':'地面近身攻击'],['移动速度',id==='centipede'?'中等 · 半血后 ×1.25':id==='scorpion'?'很慢':id==='snake'?'缓慢':item.flying?'略快':'缓慢'],['出现关卡',id==='centipede'?'1-8 ～ 1-10':id==='scorpion'?'1-9 ～ 1-10':id==='snake'?'1-10':item.flying?'1-6 ～ 1-10':'1-1 ～ 1-10'],...(id==='centipede'?[['挥斧伤害','200 / 次'],['攻击间隔','1 秒'],['半血变化','生命 ≤300 时体型 ×2']]:[]),...(id==='scorpion'?[['挥砍伤害','2000 / 次'],['攻击间隔','3 秒'],['出刀命中','蓄力 0.9 秒后']]:[]),...(id==='snake'?[['爆炸抗性','每次最多承受 500 伤害'],['冻结技能','每 40 秒随机冻结一位角色 8 秒']]:[])];
 const stats=details.map(([key,value])=>`<dt>${key}</dt><dd>${value}</dd>`).join('');
 modal('葫芦山图鉴',`<div class="book-tabs" role="tablist" aria-label="图鉴分类"><button role="tab" data-category="roles" aria-selected="${isRole}">角色</button><button role="tab" data-category="monsters" aria-selected="${!isRole}">妖怪</button></div><div class="catalogue-layout"><section class="book-collection"><h2>${isRole?'角色名录':'妖怪名录'}</h2><nav class="book-list" aria-label="${isRole?'角色':'妖怪'}列表">${entries.map(([key,c])=>`<button class="book-entry ${key===id?'chosen':''}" data-entry="${key}" aria-label="${c.name}" aria-pressed="${key===id}"><canvas width="140" height="150" aria-hidden="true"></canvas><strong>${c.name}</strong><small>${isRole?isCharacterUnlocked(key,save.completed,save.unlocks)?`${c.cost} 灵气`:'未解锁':c.flying?'飞行妖怪':key==='snake'?'关底妖怪':'地面妖怪'}</small></button>`).join('')}</nav><p class="collection-note">点击头像查看详细资料</p></section><article class="book-detail"><div class="book-art"><canvas width="220" height="280" aria-label="${item.name}形象"></canvas><span class="book-badge ${unlocked?'':'locked'}">${isRole?(item.implemented===false?'未开放':unlocked?'已解锁':'未解锁'):id==='snake'?'关底妖怪':item.flying?'飞行妖怪':'普通妖怪'}</span></div><div class="book-copy"><h2>${item.name}</h2><span class="book-source">出自《${item.source}》</span><p>${isRole?notes.description:id==='centipede'?'细长的分节身体，绿色肩甲，双手各持一柄斧头。拥有 600 生命，以中等速度沿本行前进，遇到角色后停下挥斧，每秒攻击一次，每次造成 200 伤害。生命降到 300 或以下时，体型增大到原来的两倍，移动速度提高至原来的 1.25 倍；挥斧伤害和间隔保持。五娃水弹仍能减慢它的移动与攻击节奏。':id==='scorpion'?'身披紫色甲胄，头戴双钳冠，手持大刀，尾部带有红色蝎钩。拥有 2000 生命，以很慢的速度前进。遇到同路角色后停下举刀，蓄力 0.9 秒后挥砍，每次造成 2000 伤害，正好削去满血三娃一半生命；每 3 秒挥砍一次。五娃水弹可以减慢其移动和挥刀节奏，哪吒、穿山甲与六娃按正常伤害结算。':id==='snake'?'手持金色如意，拥有 1000 生命，在 1-10 与 2-5 登场。满血时需要两次哪吒火焰或穿山甲伏击才能击败，每次爆炸最多造成 500 伤害。普通火焰弹、水弹伤害照常，水弹可使其减速。遇到地面角色后停下，用如意近身攻击。登场后每 40 秒随机冻结场上一位角色 8 秒，暂停其攻击、产出与技能准备，冰封期间仍可受伤。':id==='bat'?'蓝紫色蝙蝠翅膀，身穿橙衣、系绿领巾，持长矛飞行。生命值 300，是青蛙精的 1.5 倍。越过地面角色，不触发穿山甲；四娃、五娃可攻击，五娃水弹使其减速，哪吒火焰也能命中。':'黄褐色斑纹，披红色披肩，手持蓝色三叉戟。从右侧进入草坪，遇到角色后停下进行近身攻击。半血失去持戟手臂，改为啃咬；生命归零后掉头倒地。'}</p><dl>${stats}</dl>${isRole?`<div class="unlock-note">${notes.unlock}</div>`:''}</div></article></div>`,[{text:'图鉴目录',secondary:true,action:()=>openAlmanac()},{text:'关闭图鉴',secondary:true,action:closeModal}]);
 $('#modal').classList.add('book-modal');for(const tab of document.querySelectorAll('[data-category]'))tab.onclick=()=>openAlmanac(tab.dataset.category);for(const button of document.querySelectorAll('[data-entry]'))button.onclick=()=>openAlmanac(category,button.dataset.entry);
 for(const el of document.querySelectorAll('[data-entry]'))paintAlmanacArt(el.querySelector('canvas'),el.dataset.entry,isRole);
 const art=$('.book-art canvas');paintAlmanacArt(art,id,isRole);
 bookPreview=null;const demo=document.createElement('button');demo.className='pose-demo';demo.textContent='动作演示';demo.onclick=()=>{bookPreview={category,id,start:performance.now()};};$('.book-art').append(demo);
}
$('.almanac-button').onclick=()=>openAlmanac();
$('.load').onclick=openSaveMenu;
$('.endless').onclick=()=>modal('无尽模式', '<p>此模式暂未开放。</p><p>当前版本可体验 1-1 ～ 2-5 共十五个闯关关卡。</p>',[{text:'进入闯关',action:enterAdventure},{text:'返回菜单',secondary:true,action:closeModal}]);
$('.challenge').onclick=()=>modal('趣味挑战','<p>此模式暂未开放。</p><p>后续可加入限定阵容、低资源与特殊敌潮。</p>',[{text:'进入闯关',action:enterAdventure},{text:'返回菜单',secondary:true,action:closeModal}]);
$('.exit').onclick=()=>modal('退出游戏', '<p>通关进度已保存在本机。</p>',[{text:'退出',action:()=>{try{window.close();}catch{}modal('游戏已退出','<p>可以安全关闭此标签页。</p>',[{text:'返回游戏',action:menu}]);}},{text:'返回菜单',secondary:true,action:closeModal}]);
function start(level){
 if(!LEVELS[level])return;if(LEVELS[level].conveyor){launchBattle(level,null);return;}
 const pool=['vine','fire','wall','nezha','pangolin','tall','water','seven','erwa','six','blackcat','wukong','beta','shuke'].filter(id=>isCharacterUnlocked(id,save.completed,save.unlocks)&&CHARACTERS[id]);
 // The very first tutorial goes straight to its one available character.
 if(pool.length===1){launchBattle(level,pool);return;}
 const recommended=level>=9?['vine','erwa','water','tall','seven','nezha','pangolin','fire','wall']:level===8?['vine','fire','water','tall','seven','nezha','pangolin','wall']:level>=7?['vine','fire','water','tall','nezha','pangolin','wall']:LEVELS[level].cards;
 let deck=[];
 const cardMarkup=(id,attrs='')=>`<button class="pick-card" ${attrs}><canvas width="140" height="130"></canvas><strong>${CHARACTERS[id].name}</strong><small>${CHARACTERS[id].cost} 灵气</small></button>`;
 function renderPicker(){
  modal('选择你的角色',`<div class="prebattle-top"><div class="tray-label">上阵角色<strong>${deck.length} / ${save.slots}</strong></div><div class="loadout-tray" style="--slots:${save.slots}">${Array.from({length:save.slots},(_,i)=>deck[i]?cardMarkup(deck[i],`data-remove="${deck[i]}" aria-label="撤回${CHARACTERS[deck[i]].name}"`):'<div class="prebattle-empty" aria-label="空卡槽"></div>').join('')}</div></div><div class="selection-shelf"><div class="shelf-heading"><h2>选择你的角色</h2><span>${LEVELS[level].name} · ${LEVELS[level].title}</span></div><div class="loadout-pool">${pool.map(id=>cardMarkup(id,`data-pick="${id}" aria-pressed="${deck.includes(id)}" aria-label="选择${CHARACTERS[id].name}"`)).join('')}</div><div class="prebattle-tip">点击下方卡牌加入阵容 · 点击上方卡牌撤回</div></div><aside class="enemy-preview"><div class="enemy-heading">本关妖怪 <span>${LEVELS[level].schedule.length} 只</span></div><div class="enemy-figures">${[...new Set(LEVELS[level].schedule.map(s=>s.type??'frog'))].map(type=>`<canvas width="220" height="280" data-enemy-preview="${type}" aria-label="${MONSTERS[type].name}预览"></canvas>`).join('')}</div><div class="enemy-caption">${[...new Set(LEVELS[level].schedule.map(s=>s.type??'frog'))].map(type=>MONSTERS[type].name).join(' · ')}<small>${level===8?'蜈蚣精：半血变大 · 移速提升':level>=9?'蜈蚣精半血变大 / 蝎子大王：2000 生命 · 大刀 2000 伤害'+([10,15].includes(level)?' / 蛇精：1000 生命':''):level>=6?'注意空中来袭的蝙蝠精':'普通妖怪 · 缓慢前进'}</small></div></aside><div class="loadout-count">已选 <b>${deck.length} / ${save.slots}</b> · 最多携带 ${save.slots} 位角色</div>`,[{text:'开始战斗',disabled:deck.length===0,action:()=>{launchBattle(level,deck);closeModal();paused=false;}},{text:'推荐阵容',secondary:true,action:()=>{deck=recommended.filter(id=>pool.includes(id)).slice(0,save.slots);renderPicker();}},{text:'返回菜单',secondary:true,action:menu}]);
  $('#modal').classList.add('loadout-modal');
  for(const el of document.querySelectorAll('[data-pick],[data-remove]')){
   const id=el.dataset.pick||el.dataset.remove;paintCardPortrait(el.querySelector('canvas'),id);
   if(el.dataset.pick)el.classList.toggle('picked',deck.includes(id));
   el.onclick=()=>{if(el.dataset.remove||deck.includes(id))deck=deck.filter(x=>x!==id);else if(deck.length<save.slots)deck.push(id);else{toast(`最多上阵 ${save.slots} 位，请先撤回一位角色`);return;}renderPicker();};
  }
  for(const art of document.querySelectorAll('[data-enemy-preview]')){const type=art.dataset.enemyPreview,name=enemyPose({type},0),img=animationImages[POSES[name].file];const paint=()=>drawPose(name,110,265,{target:art.getContext('2d'),scale:['snake','scorpion'].includes(type)?1:type==='bat'?1.1:1.35});if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}

 }
 // Do not let Escape resume a finished/restarted battle beneath the picker.
 game=null;paused=true;ended=false;$('#play').hidden=true;$('#menu').hidden=false;renderPicker();
}
function launchBattle(level,deck){game=new Game(level);if(deck)game.equip(deck,save.slots);aimingId=null;selected=null;shovel=false;paused=true;ended=false;waveUntil=0;lastAutoSave=0;$('#menu').hidden=true;$('#play').hidden=false;$('#levelLabel').textContent=`${game.cfg.region}　${LEVELS[level].name}`;makeCards();updateHud();draw();checkpoint();const tips={1:'点击四娃卡片，再点击亮起的草地放置。点击金色灵气球收集资源，每个增加 25 灵气。',2:'先种小葫芦藤生产灵气，再用四娃守住三条路线。',3:'五条路线全部开放。把三娃放在四娃前方，阻挡青蛙精。',4:'点击场上的哪吒，再点击目标格，指定 3×3 火焰区域。妖怪靠近哪吒时会自动释放，使用后退场。',5:'穿山甲种下后埋伏 14 秒，探头后可触发伏击。提前布置，准备期间用三娃保护。',6:'大娃拥有 8000 耐久，将他部署在前排，为后方输出争取时间。',7:'五娃的水弹使妖怪移动和近身攻击减半，持续 10 秒。合理取舍阵容，搭配火焰与防御。',8:'空中与地面妖怪交替来袭，保留射手应对蝙蝠精。',9:'妖洞前的连续敌潮，提前建立灵气产出，防守五条路线。',10:'传送带决战：空带开局，每隔 5 秒从右侧送入一张卡牌，免费部署，每张只能用一次，最多积存八张。蛇精拥有 1000 生命，每次哪吒火焰或穿山甲伏击最多对她造成 500 伤害。提前安排输出和技能。'};
 modal(`${game.cfg.name} · ${game.cfg.title}`,`<p>${tips[level]??'深入蛇精老巢，注意空中与地面混合敌潮。六娃可伏击地面妖怪，贝塔可支援全场；请先积累灵气，逐步建立五条防线。'}</p><p>通关奖励：${game.cfg.reward?ALMANAC_CHARACTERS[game.cfg.reward].name+(ALMANAC_CHARACTERS[game.cfg.reward].implemented===false?'图鉴预告（后续开放）':''):'金币与关卡进度'}<br>点击卡片 → 点击空格；右键或 Esc 取消。</p>`,[{text:'开始守护',action:()=>{closeModal();paused=false;tone('plant');}}]);}
function paintPortrait(canvas,index){const paint=()=>{const r=rects[index],c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const h=canvas.height-3,w=h*r[2]/r[3];c.drawImage(sprites,...r,(canvas.width-w)/2,1,w,h);};if(sprites.complete&&sprites.naturalWidth)paint();else sprites.addEventListener('load',paint,{once:true});}
function paintCardPortrait(canvas,type){
 const specs={shuke:{file:'shuke-helicopter-poses',rect:[275,155,590,520]},beta:{file:'beta-tank-poses',rect:[80,90,770,760]},wukong:{file:'wukong-poses',rect:[120,100,300,490]},blackcat:{file:'blackcat-poses',rect:[175,150,325,500]},six:{file:'six-poses',rect:[75,100,420,600]},seven:{file:'seven-poses',rect:[80,90,400,600]},erwa:{file:'erwa-poses',rect:[55,90,430,600]},nezha:{file:'nezha-poses',rect:[150,115,310,500]},pangolin:{file:'pangolin-tall-poses',rect:[555,200,405,215]},tall:{file:'pangolin-tall-poses',rect:[105,400,315,420]},water:{file:'water-poses',rect:[80,90,355,480]},fire:{file:'fire-poses',rect:[85,90,360,480]},vine:{file:'support-poses',rect:[120,85,325,420]},wall:{file:'support-poses',rect:[130,516,300,365]}};
 const spec=specs[type],img=animationImages[spec.file];
 const paint=()=>{const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const h=Math.min(canvas.height,canvas.width*spec.rect[3]/spec.rect[2]),w=h*spec.rect[2]/spec.rect[3];c.drawImage(img,...spec.rect,(canvas.width-w)/2,0,w,h);};
 if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});
}
function makeCards(){$('#cards').replaceChildren();$('#hud').classList.toggle('conveyor-hud',game.conveyor);$('#cards').dataset.belt=JSON.stringify(game.cards);$('#cards').style.setProperty('--slots',game.conveyor?8:save.slots);for(const type of game.cards){const c=CHARACTERS[type],el=document.createElement('button');el.className='card';el.dataset.type=type;el.setAttribute('aria-label',game.conveyor?`${c.name}，传送带卡牌`:`${c.name}，${c.cost}灵气`);el.innerHTML=`<canvas class="portrait" width="140" height="130"></canvas><strong>${c.name}</strong><small class="card-cost">${c.cost}<span> 灵气</span></small><span class="cool"></span><span class="card-status"></span>`;paintCardPortrait(el.querySelector('canvas'),type);if(game.conveyor)el.querySelector('.card-cost').hidden=true;el.onclick=()=>select(type);$('#cards').append(el);}for(let i=$('#cards').children.length;i<(game.conveyor?0:save.slots);i++){const empty=document.createElement('div');empty.className='empty-slot';empty.setAttribute('aria-label',`空卡槽 ${i+1}`);empty.innerHTML='<span>待上阵</span>';$('#cards').append(empty);}}
function select(type){if(!game||paused||game.status!=='playing')return;const c=CHARACTERS[type];if((!game.conveyor&&game.energy<c.cost)){toast('灵气不足，点击场上的金色灵气球收集');return;}if(!game.conveyor&&game.cooldowns[type]>0){toast('卡片冷却中，请稍候');return;}selected=selected===type?null:type;aimingId=null;shovel=false;updateHud();}
$('#shovel').onclick=()=>{if(!game||paused)return;shovel=!shovel;aimingId=null;selected=null;updateHud();};
$('#sound').onclick=()=>{muted=!muted;$('#sound').textContent=`音效：${muted?'关':'开'}`;persist();if(!muted)tone('collect');};
function pause(){if(!game||game.status!=='playing'||!$('#modal').hidden)return;paused=true;const saved=checkpoint();modal('稍作休息',saved?'<p>战场已暂停并保存。</p>':'<p>战场已暂停，但保存失败。请勿关闭页面。</p>',[{text:'继续守护',action:()=>{closeModal();paused=false;}},{text:'保存战局',secondary:true,action:()=>checkpoint(true)},{text:'重新开始',secondary:true,action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:()=>modal('返回菜单？','<p>当前战局已保存，可从主菜单读取继续。</p>',[{text:'返回菜单',action:menu},{text:'继续守护',secondary:true,action:()=>{closeModal();paused=false;}}])}]);}
$('#pause').onclick=pause;
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function cell(p){return{row:Math.floor((p.y-GRID.y)/GRID.rh),col:Math.floor((p.x-GRID.x)/GRID.cw)};}
canvas.addEventListener('pointermove',e=>{hover=cell(point(e));});canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('pointerdown',e=>{if(e.button===2)return;if(!game||paused||game.status!=='playing')return;const p=point(e);const coin=[...game.coins].reverse().find(c=>Math.hypot(c.x-p.x,c.y-p.y)<30);if(coin){const value=game.collectCoin(coin.id);save.coins+=value;checkpoint();tone('collect');toast(`+${value} 金币`);updateHud();return;}const orb=[...game.orbs].reverse().find(o=>Math.hypot(o.x-p.x,o.y-p.y)<43);if(orb){game.collect(orb.id);tone('collect');updateHud();return;}const {row,col}=cell(p);if(row<0||row>4||col<0||col>8)return;if(!game.cfg.rows.includes(row)){toast('本关尚未开放这条路线');return;}if(shovel){if(game.remove(row,col))tone('plant');shovel=false;}else if(aimingId){if(game.castFire(aimingId,row,col)){tone('shoot');aimingId=null;}else{aimingId=null;toast('哪吒已释放或已退场');}}else if(selected){if(game.place(selected,row,col)){selected=null;tone('plant');}else toast('这里已有角色，或卡片暂不可用');}else{const actor=game.plants.find(p=>p.row===row&&p.col===col&&p.type==='nezha'&&!p.spent);if(actor&&actor.freezeLeft>0){toast('哪吒被冰封，解冻后才能施法');}else if(actor){aimingId=actor.id;toast('点击目标格，释放 3×3 火焰；右键取消');}}updateHud();});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();selected=null;shovel=false;aimingId=null;updateHud();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(selected||shovel||aimingId){selected=null;shovel=false;aimingId=null;updateHud();}else if(!$('#modal').hidden&&game&&game.status==='playing'){closeModal();paused=false;}else pause();}if(e.code==='Space'&&game&&$('#modal').hidden){e.preventDefault();pause();}if(e.key.toLowerCase()==='s'&&game&&!paused)$('#shovel').click();if(/^[0-9]$/.test(e.key)&&game&&!paused){const type=game.cards[e.key==='0'?9:+e.key-1];if(type)select(type);}});
window.addEventListener('pagehide',()=>checkpoint());
window.addEventListener('storage',e=>{if(e.key===SAVE_KEY&&!game){save=readSave();refreshAdventure();}});
window.addEventListener('beforeunload',()=>checkpoint());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&!paused&&game.status==='playing')pause();});
function updateHud(){if(!game)return;if(game.conveyor&&$('#cards').dataset.belt!==JSON.stringify(game.cards))makeCards();if(game.conveyor){$('#cards').querySelectorAll('.card').forEach((el,i)=>{el.style.left=`${game.beltPositions[i]*12.5}%`;});}$('#energy').hidden=game.conveyor;$('#energy strong').textContent=game.energy;$('#wallet strong').textContent=save.coins.toLocaleString();for(const el of $('#cards').querySelectorAll('.card')){const type=el.dataset.type,c=CHARACTERS[type];el.classList.toggle('selected',selected===type);el.classList.toggle('unaffordable',(!game.conveyor&&game.energy<c.cost));el.classList.toggle('cooling',(!game.conveyor&&(game.cooldowns[type]||0)>0));el.querySelector('.card-status').textContent=game.cooldowns[type]>0?Math.ceil(game.cooldowns[type])+'秒':(!game.conveyor&&game.energy<c.cost)?'灵气不足':'';el.setAttribute('aria-disabled',(!game.conveyor&&game.energy<c.cost)||(!game.conveyor&&(game.cooldowns[type]||0)>0));el.querySelector('.cool').style.transform=`scaleY(${(game.cooldowns[type]||0)/c.cooldown})`;el.setAttribute('aria-pressed',selected===type);el.title=game.conveyor?`${c.name} · 传送带一次性卡牌`:`${c.name} · ${c.cost} 灵气${game.cooldowns[type]>0?' · 冷却 '+Math.ceil(game.cooldowns[type])+' 秒':''}`;}$('#shovel').classList.toggle('active',shovel);$('#progressFill').style.width=`${100*game.spawned/game.cfg.schedule.length}%`;if(aimingId&&!game.plants.some(p=>p.id===aimingId&&!p.spent&&!(p.freezeLeft>0)))aimingId=null;$('#hint').textContent=aimingId?'点击目标区域中心，释放 3×3 火焰 · 右键取消':shovel?'点击角色将其移除 · 右键取消':selected?`已选择${CHARACTERS[selected].name} · 点击亮起的空格放置`:(game.conveyor?'传送带：每5秒送入一张 · 免费部署 · 用完消失 · 满八张暂停供卡':game.level===1?'点击四娃卡片，再点击草地 · 点击金色灵气收集资源':'先种葫芦藤积累灵气，再部署四娃 · 右键取消选择');canvas.style.cursor=aimingId||shovel?'crosshair':selected?'copy':'default';}
// Source rectangles keep all art in the generated sprite atlas; enemy is mirrored to face left.
const rects=[[0,240,350,565],[440,235,305,565],[760,230,382,575],[1150,245,386,560]];
function sprite(index,x,y,w,h,{flip=false,angle=0,alpha=1}={}){const enemy=index===2;const img=enemy?frog:sprites;if(!img.complete||!img.naturalWidth)return;const r=enemy?[220,0,850,1245]:rects[index];if(enemy){w=106;h=155;flip=false;}ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);ctx.drawImage(img,...r,-w/2,-h,w,h);ctx.restore();}
function drawPose(name,x,y,{alpha=1,angle=0,scale=1,target=ctx,flash=false,flip=false}={}){
 const pose=POSES[name],img=animationImages[pose.file];if(!img.complete||!img.naturalWidth)return;
 const [sx,sy,sw,sh]=pose.rect,s=pose.scale*scale;
 target.save();target.globalAlpha=alpha;target.translate(x,y);target.rotate(angle);if(flip)target.scale(-1,1);if(flash)target.filter='brightness(1.35)';
 if(pose.clip){target.beginPath();pose.clip.forEach(([px,py],i)=>target[i?'lineTo':'moveTo']((px-pose.pivot[0])*s,(py-pose.pivot[1])*s));target.closePath();target.clip();}
 target.drawImage(img,sx,sy,sw,sh,(sx-pose.pivot[0])*s,(sy-pose.pivot[1])*s,sw*s,sh*s);target.restore();
}
function drawBookPreview(now){
 if(!bookPreview||$('#modal').hidden||!$('.book-art canvas'))return;
 const t=(now-bookPreview.start)/1000,art=$('.book-art canvas'),c=art.getContext('2d');c.clearRect(0,0,art.width,art.height);
 const id=bookPreview.id,active=(t%2.5)>.9;let name;
 if(id==='shuke')name=active?'shukeDrop':'shukeIdle';
 else if(id==='beta')name=active?'betaFire':'betaIdle';
 else if(id==='wukong')name=active?'wukongThrow':'wukongIdle';
 else if(id==='blackcat')name=active?'blackcatShoot':'blackcatIdle';
 else if(id==='six')name=t%4<1.5?'sixIdle':t%4<2.2?'sixLeap':'sixStrike';
 else if(id==='erwa')name=active?'erwaRelease':'erwaIdle';
 else if(id==='seven')name=t%6<1.5?'sevenIdle':t%6<3?'sevenAbsorb':'sevenRefine';
 else if(id==='nezha')name=active?'nezhaCast':'nezhaIdle';
 else if(id==='pangolin')name=t%5<1.5?'pangolinBuried':t%5<3.5?'pangolinReady':'pangolinTrigger';
 else if(id==='tall')name=active?'tallDefend':'tallIdle';
 else if(id==='water')name=active?((t%2.5)<1.2?'waterPrepare':'waterRelease'):'waterIdle';
 else if(id==='fire')name=active?((t%2.5)<1.2?'firePrepare':'fireRelease'):'fireIdle';
 else if(id==='vine')name=active?'vineProduce':'vineIdle';
 else if(id==='wall')name=active?'wallDefend':'wallIdle';
 else name=enemyPose({type:id,damaged:t%7>3.5,eating:active,attackClock:active?(id==='scorpion'?t%3:.4):0,phase:0},t);
 paintAlmanacArt(art,id,bookPreview.category==='roles',name,id==='centipede'?(t%7>3.5?1:.5):1);
}
function gourd(x,y,a=0){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.shadowColor='#ad762333';ctx.shadowBlur=7;ctx.fillStyle='#e9a52f';ctx.strokeStyle='#71451c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-24);ctx.bezierCurveTo(-54,-39,-56,40,-9,27);ctx.bezierCurveTo(5,24,5,12,18,16);ctx.bezierCurveTo(51,24,54,-22,22,-16);ctx.bezierCurveTo(8,-11,5,-20,-8,-24);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#5a682a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(39,-1);ctx.quadraticCurveTo(56,-24,60,-8);ctx.stroke();ctx.fillStyle='#ffdb72aa';ctx.beginPath();ctx.ellipse(-22,-9,10,6,-.4,0,7);ctx.fill();ctx.restore();}
function drawIce(x,y,remaining){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#99e4ff66';ctx.strokeStyle='#d4f7ff';ctx.lineWidth=3;ctx.shadowColor='#51caff';ctx.shadowBlur=10;
 ctx.beginPath();ctx.moveTo(-46,0);ctx.lineTo(-53,-85);ctx.lineTo(-28,-133);ctx.lineTo(29,-140);ctx.lineTo(52,-100);ctx.lineTo(46,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle='#ecffffa8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-28,-125);ctx.lineTo(-12,-76);ctx.lineTo(-38,-45);ctx.moveTo(-12,-76);ctx.lineTo(26,-92);ctx.moveTo(34,-130);ctx.lineTo(17,-33);ctx.lineTo(42,-9);ctx.stroke();
 ctx.fillStyle='#e4fbff';ctx.strokeStyle='#225c85';ctx.font='bold 20px KaiTi';ctx.textAlign='center';ctx.lineWidth=4;const label=`冰封 ${Math.ceil(remaining)}秒`;ctx.strokeText(label,0,-150);ctx.fillText(label,0,-150);ctx.restore();
}
function drawStaff(x,y,angle,alpha=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.shadowColor='#efc456';ctx.shadowBlur=9;ctx.fillStyle='#ba3026';ctx.strokeStyle='#6a261c';ctx.lineWidth=2;ctx.fillRect(-49,-5,98,10);ctx.strokeRect(-49,-5,98,10);ctx.fillStyle='#f4cf60';ctx.fillRect(-51,-7,17,14);ctx.fillRect(34,-7,17,14);ctx.fillStyle='#fff1a2';ctx.fillRect(-49,-5,3,10);ctx.fillRect(45,-5,3,10);ctx.restore();
}
function drawShuke(p){
 const home=GRID.x+(p.col+.5)*GRID.cw,floor=GRID.y+(p.row+1)*GRID.rh-7;
 const flight=game.spells.find(s=>s.ownerId===p.id&&['net','stone','mushroom'].includes(s.kind));
 const progress=flight?(flight.age<.35?flight.age/.35:flight.age<=flight.delay?1:Math.max(0,1-(flight.age-flight.delay)/(flight.life-flight.delay))):0;
 const x=flight?home+(flight.targetX-home)*progress:home,time=p.freezeLeft>0?0:game.time,y=Math.max(310,floor-155)+Math.sin(time*4+p.id)*3;
 ctx.save();ctx.fillStyle='#17241b35';ctx.beginPath();ctx.ellipse(x,floor,45,9,0,0,7);ctx.fill();ctx.restore();
 drawPose(plantPose(p),x,y,{scale:WORLD_SCALE.shuke,flash:p.hit>0});
 ctx.save();ctx.strokeStyle='#f5bda370';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x-4,y-95,72,4,0,0,7);ctx.stroke();ctx.strokeStyle='#ffe2bb99';ctx.beginPath();const rotor=Math.sin(time*45)*70;ctx.moveTo(x-4-rotor,y-95);ctx.lineTo(x-4+rotor,y-95);ctx.stroke();ctx.restore();
 if(p.freezeLeft>0)drawIce(x,y,p.freezeLeft);
}
function drawEnemyControl(e,x,y){
 const size=monsterScale(e)*(e.type==='scorpion'?1.5:1),top=y-(e.type==='bat'?38:0)-135*size;
 if(e.netLeft>0){
  ctx.save();ctx.fillStyle='#cfc09c33';ctx.strokeStyle='#e1c892';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x-25*size,top);ctx.lineTo(x+25*size,top);ctx.lineTo(x+55*size,y);ctx.lineTo(x-55*size,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.clip();
  for(let i=-220;i<220;i+=19){ctx.beginPath();ctx.moveTo(x+i*size,top);ctx.lineTo(x+(i+110)*size,y+10);ctx.moveTo(x+i*size,top);ctx.lineTo(x+(i-110)*size,y+10);ctx.stroke();}ctx.restore();
 }
 if(isCharmed(e)){
  ctx.save();ctx.strokeStyle='#b1ed96';ctx.lineWidth=3;ctx.shadowColor='#ae77d9';ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(x,y-2,43*size,10,0,0,7);ctx.stroke();
  for(let i=0;i<2;i++){const hx=x+(i?23:-17)*size,hy=top-6-Math.sin(game.time*4+i)*5;ctx.fillStyle=i?'#e2abf4':'#ed87be';ctx.beginPath();ctx.moveTo(hx,hy+9);ctx.bezierCurveTo(hx-19,hy-3,hx-5,hy-16,hx,hy-7);ctx.bezierCurveTo(hx+5,hy-16,hx+19,hy-3,hx,hy+9);ctx.fill();}ctx.restore();
 }
}
function drawDropItem(kind,x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineWidth=2.5;ctx.strokeStyle='#493b2c';
 if(kind==='net'){
  ctx.fillStyle='#dac69a66';ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(18,-16);ctx.lineTo(26,18);ctx.lineTo(-26,18);ctx.closePath();ctx.fill();ctx.stroke();ctx.clip();for(let i=-40;i<=40;i+=10){ctx.beginPath();ctx.moveTo(i,-20);ctx.lineTo(i+30,25);ctx.moveTo(i,-20);ctx.lineTo(i-30,25);ctx.stroke();}
 }else if(kind==='stone'){
  ctx.fillStyle='#8a9093';ctx.beginPath();ctx.moveTo(-19,4);ctx.lineTo(-12,-17);ctx.lineTo(6,-21);ctx.lineTo(21,-3);ctx.lineTo(15,16);ctx.lineTo(-8,19);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#b9bec1';ctx.beginPath();ctx.moveTo(-12,-15);ctx.lineTo(5,-19);ctx.lineTo(0,-1);ctx.lineTo(-17,2);ctx.fill();
 }else{
  ctx.fillStyle='#f1d6a9';ctx.fillRect(-6,-3,12,24);ctx.strokeRect(-6,-3,12,24);ctx.fillStyle='#9454b8';ctx.beginPath();ctx.ellipse(0,-3,25,18,0,Math.PI,Math.PI*2);ctx.quadraticCurveTo(0,7,-25,-3);ctx.fill();ctx.stroke();ctx.fillStyle='#d5ef83';for(const [px,py,r]of [[-12,-10,4],[5,-16,4],[14,-6,3]]){ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill();}
 }ctx.restore();
}
function drawSpell(spell){
 if(['net','stone','mushroom'].includes(spell.kind)){
  const y=GRID.y+(spell.row+.55)*GRID.rh;
  if(!spell.hit&&spell.age>=.35){const t=Math.min(1,(spell.age-.35)/(spell.delay-.35));const startY=Math.max(310,GRID.y+(spell.row+1)*GRID.rh-7-155)-16;drawDropItem(spell.kind,spell.targetX,startY+(y-startY)*t*t);}
  if(spell.hit){const t=spell.age-spell.delay,alpha=Math.max(0,1-t/(spell.life-spell.delay));ctx.save();ctx.globalAlpha=alpha;
   if(spell.kind==='net'){ctx.strokeStyle='#e7d29b';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(spell.targetX,y+20,GRID.cw,23+t*15,0,0,7);ctx.stroke();}
   else if(spell.kind==='stone'){ctx.strokeStyle='#dad0b4';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(spell.targetX,y+20,20+t*70,9+t*20,0,0,7);ctx.stroke();drawDropItem('stone',spell.targetX,y+8+t*10,.8);}
   else{ctx.fillStyle='#bb79d477';ctx.beginPath();ctx.arc(spell.targetX,y-30,25+t*45,0,7);ctx.fill();drawDropItem('mushroom',spell.targetX,y,1);}
   ctx.restore();
  }return;
 }
 if(spell.kind==='ambush'){
  const floor=GRID.y+(spell.row+1)*GRID.rh-7,t=Math.min(1,spell.age/spell.delay),x=spell.fromX+(spell.targetX-spell.fromX)*t;
  if(!spell.hit){drawPose('sixLeap',x,floor-Math.sin(t*Math.PI)*120,{scale:WORLD_SCALE.six,alpha:Math.min(1,t*4)});}else{
   const alpha=Math.max(0,1-(spell.age-spell.delay)/(spell.life-spell.delay));drawPose('sixStrike',spell.targetX,floor,{scale:WORLD_SCALE.six,alpha});ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#c5b9e8';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(spell.targetX,floor-2,25+(1-alpha)*75,8+(1-alpha)*17,0,0,7);ctx.stroke();ctx.restore();
  }return;
 }

 const x=GRID.x+(spell.col+.5)*GRID.cw,y=GRID.y+(spell.row+.55)*GRID.rh;
 if(spell.kind==='shell'){
  ctx.save();
  if(!spell.hit){
   const t=Math.min(1,spell.age/spell.delay),startY=GRID.y+(spell.fromRow+.4)*GRID.rh;
   const px=spell.fromX+(x-spell.fromX)*t,py=startY+(y-startY)*t-Math.sin(t*Math.PI)*190;
   ctx.strokeStyle='#ffce69';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();ctx.ellipse(x,y,42,18,0,0,7);ctx.stroke();ctx.setLineDash([]);
   ctx.translate(px,py);ctx.rotate(Math.atan2(y-startY-Math.cos(t*Math.PI)*Math.PI*190,x-spell.fromX));ctx.fillStyle='#e5b94e';ctx.strokeStyle='#533d27';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,18,9,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff1a3';ctx.fillRect(-20,-5,7,10);
  }else{
   const t=spell.age-spell.delay,alpha=Math.max(0,1-t/(spell.life-spell.delay));
   ctx.beginPath();ctx.rect(GRID.x,GRID.y,GRID.cw*9,GRID.rh*5);ctx.clip();ctx.globalAlpha=alpha;
   ctx.fillStyle='#f4ae4355';ctx.fillRect(GRID.x+Math.max(0,spell.col-1)*GRID.cw,GRID.y+Math.max(0,spell.row-1)*GRID.rh,(Math.min(8,spell.col+1)-Math.max(0,spell.col-1)+1)*GRID.cw,(Math.min(4,spell.row+1)-Math.max(0,spell.row-1)+1)*GRID.rh);
   ctx.strokeStyle='#ffe3a0';ctx.lineWidth=8*alpha;ctx.beginPath();ctx.ellipse(x,y,35+t*180,20+t*110,0,0,7);ctx.stroke();
   for(let i=0;i<9;i++){const angle=i*Math.PI*2/9;ctx.fillStyle=i%2?'#ef9838':'#ffdc7c';ctx.beginPath();ctx.arc(x+Math.cos(angle)*t*110,y+Math.sin(angle)*t*75-t*30,12+alpha*16,0,7);ctx.fill();}
  }
  ctx.restore();return;
 }
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
function draw(){if(!game)return;ctx.clearRect(0,0,W,H);const backdrop=game.cfg.map==='cave'?caveMap:map;if(backdrop.complete&&backdrop.naturalWidth)ctx.drawImage(backdrop,0,0,W,H);else{ctx.fillStyle='#7c9e62';ctx.fillRect(0,0,W,H);}for(let row=0;row<5;row++){if(!game.cfg.rows.includes(row)){ctx.fillStyle='#163b2f8f';ctx.fillRect(GRID.x,GRID.y+row*GRID.rh,GRID.cw*9,GRID.rh);ctx.fillStyle='#f0e4b8b0';ctx.font='22px KaiTi';ctx.textAlign='center';ctx.fillText('尚 未 开 放',GRID.x+GRID.cw*4.5,GRID.y+(row+.57)*GRID.rh);}}
 if(hover&&(selected||shovel)&&game.cfg.rows.includes(hover.row)&&hover.col>=0&&hover.col<9){
  const x=GRID.x+hover.col*GRID.cw,y=GRID.y+hover.row*GRID.rh,occupied=game.plants.some(p=>p.row===hover.row&&p.col===hover.col),valid=shovel?occupied:!occupied;
  ctx.save();ctx.fillStyle=valid?'#fff5b650':'#e35d3d55';ctx.fillRect(x+1,y+1,GRID.cw-2,GRID.rh-2);ctx.strokeStyle=valid?'#fff0a2':'#b94224';ctx.lineWidth=3;ctx.setLineDash([10,5]);ctx.strokeRect(x+3,y+3,GRID.cw-6,GRID.rh-6);ctx.restore();
  if(selected&&valid)drawPose(plantPose({type:selected,hp:CHARACTERS[selected].hp,timer:10}),x+GRID.cw/2,selected==='shuke'?Math.max(310,y+GRID.rh-7-155):y+GRID.rh-7,{alpha:.6,scale:WORLD_SCALE[selected]});
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
  if(a.p){const p=a.p;if(p.type==='shuke'||p.type==='six'&&p.spent)continue;const recoil=p.hit>0?-3:0;drawPose(plantPose({...p,aiming:p.id===aimingId}),a.x+recoil,y+(p.freezeLeft>0?0:Math.sin(game.time*2+p.id)*1.2),{angle:p.hit>0?-.04:0,flash:p.hit>0,scale:WORLD_SCALE[p.type],flip:p.type==='blackcat'&&p.aimLeft,alpha:p.spent?Math.min(1,p.retireLeft/.25):p.type==='six'&&!(p.freezeLeft>0)?.38:1});if(p.type==='seven'&&p.refineLeft>0&&!(p.freezeLeft>0)){ctx.fillStyle='#f1d6ff';ctx.strokeStyle='#59347b';ctx.lineWidth=3;ctx.font='bold 17px KaiTi';ctx.textAlign='center';const text=`炼化 ${Math.ceil(p.refineLeft)}秒`;ctx.strokeText(text,a.x,y-100);ctx.fillText(text,a.x,y-100);}if(p.type==='nezha'&&!p.spent&&!(p.freezeLeft>0)){ctx.fillStyle='#fff0a1';ctx.strokeStyle='#68401d';ctx.lineWidth=3;ctx.font='bold 16px KaiTi';ctx.textAlign='center';ctx.strokeText(p.id===aimingId?'指定目标':'点击施法',a.x,y-145);ctx.fillText(p.id===aimingId?'指定目标':'点击施法',a.x,y-145);}if(p.type==='pangolin'&&!p.spent&&!(p.freezeLeft>0)){ctx.fillStyle=p.armed?'#f7eea5':'#e8d4aa';ctx.font='15px KaiTi';ctx.textAlign='center';ctx.fillText(p.armed?'就绪':Math.ceil(p.armLeft)+'秒',a.x,y-52);}if(p.freezeLeft>0)drawIce(a.x,y,p.freezeLeft);}
  else{const e=a.e;const sway=Math.sin((e.netLeft>0?0:game.time)*(e.slowLeft>0?3:6)+(e.phase||0));drawPose(enemyPose(e,e.netLeft>0?0:game.time),e.x+(e.hit>0?4:0),y-(e.type==='bat'?38+Math.sin((e.netLeft>0?0:game.time)*6+(e.phase||0))*7:e.eating?0:Math.abs(sway)*2),{flip:isCharmed(e),angle:e.hit>0?.045:0,flash:e.hit>0,scale:monsterScale(e)*(e.type==='scorpion'?WORLD_SCALE.scorpion:['bat','snake','centipede'].includes(e.type)?1:WORLD_SCALE.frog)});drawEnemyControl(e,e.x,y);if(e.slowLeft>0){ctx.save();ctx.strokeStyle='#8cddf0';ctx.lineWidth=3;ctx.shadowColor='#38bfff';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(e.x,y-3,39,9,0,0,7);ctx.stroke();ctx.fillStyle='#a7efff';ctx.font='bold 20px KaiTi';ctx.textAlign='center';ctx.fillText('缓',e.x+42,y-72);ctx.restore();}}
 }
 for(const body of game.corpses){const y=GRID.y+(body.row+1)*GRID.rh-7;const fall=Math.min(1,body.age/.65);drawPose(body.type==='centipede'?'centipedeWalk':body.type==='scorpion'?'scorpionWalk':body.type==='snake'?'snakeIdle':body.type==='bat'?'batFlyB':'corpse',body.x,body.type==='bat'?y-38+Math.min(38,body.age*90):y,{flip:!!body.charmed,angle:-Math.PI*.48*fall,alpha:Math.min(1,(body.life-body.age)/.45),scale:monsterScale(body)*(body.type==='scorpion'?WORLD_SCALE.scorpion:['bat','snake','centipede'].includes(body.type)?1:WORLD_SCALE.frog)});}
 for(const part of game.debris){const head=part.kind==='head',t=part.age;const floor=GRID.y+(part.row+1)*GRID.rh-7;const start=head?-80:-22;const ballistic=start-(head?180:130)*t+320*t*t;const bounce=ballistic>0?-(head?8:4)*Math.abs(Math.sin((t-.7)*8))*Math.max(0,1.4-t):ballistic;drawPose(part.kind,part.x+(head?-48:38)*Math.min(t,1.2),floor+bounce,{angle:(head?-1.9:1.4)*Math.min(t,1.4),alpha:Math.min(1,(part.life-t)/.5),scale:WORLD_SCALE.frog});}
 for(const staff of game.staves){const y=GRID.y+(staff.row+.45)*GRID.rh;drawStaff(staff.x,y,game.time*10,1);ctx.save();ctx.strokeStyle='#f8dc6a80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(staff.x,GRID.y+(staff.row+1)*GRID.rh-7,60,12,0,0,7);ctx.stroke();ctx.restore();}
 for(const b of game.bullets){const y=b.kind==='shot'?b.y:GRID.y+(b.row+.45)*GRID.rh-(b.lift||0);ctx.save();if(b.kind==='staff'){drawStaff(b.x,y,game.time*13);}else if(b.kind==='shot'){ctx.translate(b.x,y);ctx.rotate(b.angle||0);ctx.shadowColor='#ffd970';ctx.shadowBlur=10;ctx.fillStyle='#fff7bf';ctx.beginPath();ctx.ellipse(0,0,10,4,0,0,7);ctx.fill();ctx.strokeStyle='#f4b84caa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-26,0);ctx.stroke();}else if(b.kind==='gold'){ctx.shadowColor='#ffe265';ctx.shadowBlur=18;const glow=ctx.createRadialGradient(b.x,y,2,b.x,y,18);glow.addColorStop(0,'#fffde0');glow.addColorStop(.45,'#ffe67a');glow.addColorStop(1,'#dca52b');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(b.x,y,18,10,0,0,7);ctx.fill();ctx.strokeStyle='#fff5ad99';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-18,y);ctx.lineTo(b.x-39,y);ctx.stroke();}else if(b.kind==='water'){ctx.shadowColor='#35c5f7';ctx.shadowBlur=12;const g=ctx.createRadialGradient(b.x-4,y-4,1,b.x,y,17);g.addColorStop(0,'#f0ffff');g.addColorStop(.35,'#9feaff');g.addColorStop(1,'#1785d4');ctx.fillStyle=g;ctx.strokeStyle='#c3f6ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,y,17,13,0,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle='#75d7f780';ctx.beginPath();ctx.moveTo(b.x-20,y);ctx.lineTo(b.x-35,y+2);ctx.stroke();}else{ctx.shadowColor='#ff6e16';ctx.shadowBlur=16;ctx.fillStyle='#ea4e15';ctx.beginPath();ctx.moveTo(b.x-27,y-8);ctx.quadraticCurveTo(b.x-5,y-1,b.x-24,y+10);ctx.quadraticCurveTo(b.x+27,y+19,b.x+16,y);ctx.quadraticCurveTo(b.x+13,y-17,b.x-27,y-8);ctx.fill();ctx.fillStyle='#fff195';ctx.beginPath();ctx.ellipse(b.x+5,y,9,6,0,0,7);ctx.fill();}ctx.restore();}
 for(const spell of game.spells)drawSpell(spell);
 for(const p of game.plants)if(p.type==='shuke')drawShuke(p);
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
  modal('守护成功！',`${c?`<canvas class="reward" width="220" height="260" aria-label="${c.name}"></canvas><p>${c.implemented===false?'获得角色预告：':'获得新角色：'}<b>${c.name}</b><br>${roleNotes[game.cfg.reward].description}</p>`:`<p>${game.level===15?'深入洞府，击退蛇精，守住了这座如意深殿。':game.level===10?'蛇精退入老巢！第二章蛇窟已开放。':'守住了这一波妖怪，继续向蛇精的洞府前进。'}</p>`}<p>${game.cfg.name} 已完成 · 击退 ${game.kills} 只妖怪<br>本关结算 +${earnings} 金币 · 钱袋 ${save.coins} 金币<br>进度已自动保存</p>`,[{text:LEVELS[next]?`进入 ${LEVELS[next].name}`:'当前关卡全部完成',action:()=>LEVELS[next]?start(next):menu()},{text:'重玩本关',secondary:true,action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:menu}]);
  const art=$('canvas.reward');if(!c)return;if(c.pose){const paint=()=>drawPose(c.pose,110,247,{target:art.getContext('2d'),scale:c.name==='大娃'?1.25:1.5});const img=animationImages[POSES[c.pose].file];if(img.complete&&img.naturalWidth)paint();else img.addEventListener('load',paint,{once:true});}else paintPortrait(art,c.sprite);
 }else modal(game.cfg.chapter===2?'洞府防线失守':'妖怪闯进了藤园','<p>试着多种葫芦藤积累灵气，<br>用三娃保护后排，并及时使用范围技能。</p>',[{text:'重新挑战',action:()=>start(game.level)},{text:'返回菜单',secondary:true,action:menu}]);
}
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(game){if(!paused){advanceBattle(game,dt,speed);for(const e of game.events.splice(0)){if(e.type==='freeze')toast('蛇精施展冰封！');if(e.type==='wave')waveUntil=game.time+4;if(['shoot','collect','mower','won','lost','cast','blast','mine'].includes(e.type))tone(e.type);}if(game.status!=='playing')finish();else if(game.time-lastAutoSave>=10)checkpoint();updateHud();}draw();}drawBookPreview(now);requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Explicit QA flag: deterministic engine access for browser integration tests, absent in normal sessions.
if(new URLSearchParams(location.search).has('qa'))window.__qa={get game(){return game;},start,select,get paused(){return paused;},get save(){return save;},freeze(value=true){paused=value;},render:draw,step(seconds){if(!game||paused)return;for(let t=0;t<seconds&&game.status==='playing';t+=.05)game.step(.05);if(game.status!=='playing')finish();else if(game.time-lastAutoSave>=10)checkpoint();updateHud();draw();}};
if(window.gameUpdates){
 window.prepareGameUpdate=()=>{paused=true;return game?.status==='playing'?checkpoint():persist();};
 initDesktopUpdates({pauseForUpdates:()=>{const previous=paused;if(game?.status==='playing'){paused=true;checkpoint();}return()=>{paused=previous;};},onAvailable:toast});
}

