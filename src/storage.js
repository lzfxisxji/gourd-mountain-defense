import {isCharacterUnlocked} from './roster.js';
import {Game,GRID,CHARACTERS,LEVELS,MONSTERS} from './engine.js';
import {LAST_LEVEL} from './levels.js';
export const SAVE_KEY='gourd-mountain-save-v1';
const ARRAYS=['plants','enemies','bullets','orbs','effects','debris','corpses','mowers','spells','coins','staves'];
const VALUES=['level','time','energy','cooldowns','spawned','kills','nextSky','waveShown','randomState','nextId','loadout','slotCapacity'];
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x,min,max)=>Number.isInteger(x)&&finite(x,min,max);
export const emptySave=()=>({version:2,completed:0,coins:0,slots:6,unlocks:{blackcat:false,wukong:false},updatedAt:null,battle:null,settings:{muted:false,speed:1}});
export function snapshotGame(game){
 if(!game||game.status!=='playing')return null;
 const data={version:1};for(const k of [...ARRAYS,...VALUES])data[k]=clone(game[k]);return data;
}
export function restoreGame(data){
 if(!data||data.version!==1||!LEVELS[data.level])throw Error('不支持的战局');
 data={...data,spells:data.spells??[],coins:data.coins??[],staves:data.staves??[]};
 const cfg=LEVELS[data.level];
 data={loadout:null,slotCapacity:6,...data};const deck=data.loadout??cfg.cards;
 if(data.loadout!==null){const probe=new Game(data.level);probe.equip(deck,data.slotCapacity);}
 else if(!integer(data.slotCapacity,6,10))throw Error('卡槽无效');
 if(!integer(data.nextId,0,1000000000))throw Error('对象编号无效');
 if(!finite(data.time,0,86400)||!integer(data.energy,0,1000000)||!integer(data.spawned,0,cfg.schedule.length)||!integer(data.kills,0,cfg.schedule.length)||!finite(data.nextSky,0,86460)||typeof data.waveShown!=='boolean'||!integer(data.randomState,1,4294967295))throw Error('战局数值无效');
 for(const k of ARRAYS)if(!Array.isArray(data[k])||data[k].length>500)throw Error('战局列表无效');
 // Reject non-finite numeric values, unknown nested objects and oversized files before mutation.
 const scan=(v,depth=0)=>{if(depth>6)throw Error('存档结构无效');if(typeof v==='number'&&!Number.isFinite(v))throw Error('存档数值无效');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('存档字段无效');scan(x,depth+1);}};scan(data);
 const ids=new Set(),positions=new Set();
 for(const p of data.plants){const c=CHARACTERS[p.type],pos=`${p.row}:${p.col}`;if(!c||!deck.includes(p.type)||!cfg.rows.includes(p.row)||!integer(p.col,0,8)||!integer(p.id,1,1000000000)||ids.has(p.id)||positions.has(pos)||!finite(p.hp,.001,c.hp)||!finite(p.timer,-86400,120)||!finite(p.windup,0,1)||!finite(p.action,0,2)||!finite(p.hit,0,2)||typeof p.defending!=='boolean')throw Error('角色数据无效');ids.add(p.id);positions.add(pos);}
 for(const p of data.plants){if(!finite(p.refineLeft??0,0,42)||!integer(p.burstLeft??0,0,1)||!finite(p.burstDelay??0,0,.14))throw Error('角色技能计时无效');if(!finite(p.freezeLeft??0,0,8))throw Error('冻结状态无效');if(p.spent!==undefined&&(typeof p.spent!=='boolean'||!finite(p.retireLeft,0,1)))throw Error('技能状态无效');if(p.type==='pangolin'&&(!finite(p.armLeft,0,14)||typeof p.armed!=='boolean'))throw Error('埋伏状态无效');}
 for(const spell of data.spells){if(!integer(spell.id,1,1000000000)||ids.has(spell.id)||!['fire','mine','ambush'].includes(spell.kind)||!cfg.rows.includes(spell.row)||!cfg.rows.includes(spell.fromRow)||!integer(spell.col,0,8)||!finite(spell.fromX,GRID.x,GRID.x+GRID.cw*9)||!finite(spell.age,0,2)||!finite(spell.life,.1,2)||!finite(spell.delay,0,1)||typeof spell.hit!=='boolean'||!finite(spell.damage,1,1800))throw Error('范围技能无效');ids.add(spell.id);}
 for(const s of data.spells)if(s.kind==='ambush'&&(!finite(s.targetX,GRID.x,GRID.x+GRID.cw*9)||s.fromRow!==s.row))throw Error('突袭目标无效');
 for(const e of data.enemies)if(!MONSTERS[e.type??'frog']||!cfg.rows.includes(e.row)||!integer(e.id,1,1000000000)||ids.has(e.id)||!finite(e.x,0,1800)||!finite(e.hp,.001,MONSTERS[e.type??'frog']?.hp??0)||!finite(e.slowLeft??0,0,10)||![undefined,.5].includes(e.slowFactor))throw Error('妖怪数据无效');else ids.add(e.id);
 for(const e of data.enemies)if(!finite(e.freezeClock??40,0,40)||!finite(e.castLeft??0,0,.65))throw Error('冻结技能无效');
 for(const e of data.enemies)if(!finite(e.hit,0,2)||!finite(e.attackClock,0,(MONSTERS[e.type??'frog'].attackInterval??1)+.1)||!finite(e.phase,0,10)||typeof e.eating!=='boolean'||typeof e.damaged!=='boolean'||typeof e.attackHasHit!=='boolean')throw Error('妖怪动作无效');
 for(const b of data.bullets)if(!cfg.rows.includes(b.row)||!finite(b.x,0,1800)||!finite(b.damage,1,1000)||!finite(b.lift??0,0,40)||!['fire','water','gold','shot','staff',undefined].includes(b.kind))throw Error('弹丸数据无效');
 for(const b of data.bullets)if(b.kind==='shot'&&(!finite(b.y,0,1000)||!integer(b.targetId,1,1000000000)||!finite(b.life,0,6)||!finite(b.angle??0,-Math.PI,Math.PI)))throw Error('追踪弹丸数据无效');
 for(const s of data.staves)if(!integer(s.id,1,1000000000)||ids.has(s.id)||!cfg.rows.includes(s.row)||!finite(s.x,GRID.x,GRID.x+GRID.cw*9)||!finite(s.life,0,5)||!finite(s.tickClock,0,1)||!integer(s.ticks,0,5))throw Error('金箍棒状态无效');else ids.add(s.id);
 for(const c of data.coins)if(!integer(c.id,1,1000000000)||ids.has(c.id)||!finite(c.x,0,1800)||!finite(c.y,0,1000)||![10,50].includes(c.value)||!finite(c.life,0,20))throw Error('金币数据无效');else ids.add(c.id);
 for(const o of data.orbs)if(!integer(o.id,1,1000000000)||ids.has(o.id)||!finite(o.x,0,1800)||!finite(o.y,0,1000)||!finite(o.target,0,1000)||!finite(o.life,0,30))throw Error('灵气数据无效');else ids.add(o.id);
 for(const f of data.effects)if(f.kind==='absorb'&&(!finite(f.toX,GRID.x,GRID.x+GRID.cw*9)||!finite(f.toY,GRID.y,1000)))throw Error('吸收效果无效');
 for(const c of data.corpses)if(!MONSTERS[c.type??'frog'])throw Error('妖怪残影无效');
 for(const k of ['effects','debris','corpses'])for(const a of data[k])if(!finite(a.x,0,2000)||!finite(a.life,0,5)||(k==='effects'?!finite(a.y,0,1000):!cfg.rows.includes(a.row)||!finite(a.age,0,5)||(k==='debris'&&!['arm','head'].includes(a.kind))))throw Error('动画数据无效');
 if(data.mowers.length!==GRID.rows||data.mowers.some((m,i)=>m.row!==i||!finite(m.x,0,2000)||typeof m.used!=='boolean'||typeof m.active!=='boolean'))throw Error('葫芦数据无效');
 if(!data.cooldowns||typeof data.cooldowns!=='object'||Array.isArray(data.cooldowns)||Object.entries(data.cooldowns).some(([k,v])=>!CHARACTERS[k]||!finite(v,0,CHARACTERS[k].cooldown)))throw Error('冷却数据无效');
 const g=new Game(data.level);for(const k of [...ARRAYS,...VALUES])g[k]=clone(data[k]);g.status='playing';g.events=[];
 // Resume actor IDs beyond all active entities and pending skills.
 g.reserveIds(Math.max(0,...ids));return g;
}
export function decodeSave(raw){
 if(typeof raw!=='string'||raw.length>1000000)throw Error('存档文件过大');
 const data=JSON.parse(raw);if(!data||!integer(data.completed,0,LAST_LEVEL))throw Error('通关记录无效');
 if(data.version===1)return{...emptySave(),completed:data.completed,updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null};
 if(data.version!==2||!data.settings||typeof data.settings.muted!=='boolean')throw Error('存档版本无效');
 if(!integer(data.coins??0,0,1000000000)||!integer(data.slots??6,6,10))throw Error('商店数据无效');
 if(![1,1.5,2].includes(data.settings.speed??1))throw Error('倍速设置无效');
 const unlocks=data.unlocks??{blackcat:false};if(unlocks&&unlocks.wukong!==undefined&&typeof unlocks.wukong!=='boolean')throw Error('角色购买数据无效');if(!unlocks||typeof unlocks!=='object'||Array.isArray(unlocks)||typeof unlocks.blackcat!=='boolean')throw Error('角色购买数据无效');
 if(data.battle!==null){const g=restoreGame(data.battle);if(g.cards.some(id=>!isCharacterUnlocked(id,data.completed,unlocks)&&(g.loadout!==null||!LEVELS[g.level].cards.includes(id)))||(g.loadout&&g.cards.length>(data.slots??6)))throw Error('上阵角色尚未解锁或超过卡槽');}
 return{version:2,completed:data.completed,coins:data.coins??0,slots:data.slots??6,unlocks:{blackcat:unlocks.blackcat,wukong:unlocks.wukong??false},updatedAt:typeof data.updatedAt==='string'?data.updatedAt:null,battle:data.battle?clone(data.battle):null,settings:{muted:data.settings.muted,speed:data.settings.speed??1}};
}
export function encodeSave(data){const raw=JSON.stringify(data);decodeSave(raw);return raw;}
