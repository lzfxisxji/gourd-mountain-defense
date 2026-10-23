export const GRID={x:337,y:280,cw:124,rh:116,cols:9,rows:5};
import {LEVELS,BELT_SEQUENCE} from './levels.js';
export {LEVELS} from './levels.js';
export const CHARACTERS={wukong:{name:'孙悟空',cost:300,hp:300,cooldown:7.5,role:'staff',source:'大闹天宫',pose:'wukongIdle',interval:5,damage:50,duration:5},blackcat:{name:'黑猫警长',cost:225,hp:300,cooldown:7.5,role:'shooter',source:'黑猫警长',pose:'blackcatIdle',interval:1.4,damage:20,burstCount:2,burstGap:.14,globalTarget:true},six:{name:'六娃',cost:50,hp:300,cooldown:30,role:'ambusher',source:'葫芦兄弟',pose:'sixIdle',damage:1800,rangeTiles:1.25},seven:{name:'七娃',cost:150,hp:300,cooldown:7.5,role:'absorber',source:'葫芦兄弟',pose:'sevenIdle',refineTime:42,rangeTiles:1},erwa:{name:'二娃',cost:200,hp:300,cooldown:7.5,role:'shooter',source:'葫芦兄弟',pose:'erwaIdle',interval:1.4,damage:20,burstCount:2,burstGap:.14},nezha:{name:'哪吒',cost:150,hp:300,cooldown:50,damage:1800,role:'caster',pose:'nezhaIdle',source:'哪吒闹海'},pangolin:{name:'穿山甲',cost:25,hp:300,cooldown:30,armTime:14,damage:1800,role:'mine',pose:'pangolinReady',source:'葫芦兄弟'},tall:{name:'大娃',cost:125,hp:8000,cooldown:30,role:'wall',pose:'tallIdle',source:'葫芦兄弟'},water:{name:'五娃',cost:175,hp:300,cooldown:7.5,interval:1.4,damage:20,slowDuration:10,slowFactor:.5,pose:'waterIdle',role:'shooter',source:'葫芦兄弟'},fire:{name:'四娃',cost:100,hp:300,cooldown:7.5,interval:1.4,damage:20,sprite:0,role:'shooter',source:'葫芦兄弟'},vine:{name:'小葫芦藤',cost:50,hp:300,cooldown:7.5,interval:24,sprite:1,role:'producer',source:'葫芦兄弟'},wall:{name:'三娃',cost:50,hp:4000,cooldown:30,sprite:3,role:'wall',source:'葫芦兄弟'}};
export const MONSTERS={centipede:{name:'蜈蚣精',hp:600,speed:18,attack:200,source:'葫芦兄弟'},scorpion:{name:'蝎子大王',hp:2000,speed:8,attack:2000,attackInterval:3,attackImpact:.9,source:'葫芦兄弟'},snake:{name:'蛇精',hp:1000,speed:10,attack:100,blastLimit:500,freezeInterval:40,freezeDuration:8,source:'葫芦兄弟'},bat:{name:'蝙蝠精',hp:300,speed:20,attack:0,flying:true,source:'葫芦兄弟'},frog:{name:'青蛙精',hp:200,speed:17,attack:100,source:'葫芦兄弟'}};
export const monsterStats=e=>MONSTERS[e.type??'frog'];
export const monsterScale=e=>e.type==='centipede'&&(e.damaged||e.hp<=300)?2:1;
export const monsterSpeed=e=>monsterStats(e).speed*(monsterScale(e)>1?1.25:1);
const LAWN_RIGHT=GRID.x+GRID.cols*GRID.cw;
const onLawn=e=>e.x<=LAWN_RIGHT&&e.x>=GRID.x;
export class Game{
 constructor(level=1,random=null){
  this.loadout=null;this.slotCapacity=6;this.nextId=0;this.level=level;this.cfg=LEVELS[level];this.battleMode=this.cfg.conveyor?'conveyor':'normal';this.belt=this.conveyor?['fire','fire','fire','fire','fire','wall','water','erwa']:[];this.beltClock=4;this.beltCursor=0;this.randomState=(Math.random()*4294967295)>>>0||1;this.random=random??(()=>{let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;});this.time=0;this.energy=150;
  this.plants=[];this.enemies=[];this.bullets=[];this.orbs=[];this.effects=[];this.debris=[];this.corpses=[];this.spells=[];this.coins=[];this.staves=[];
  this.cooldowns={};this.mowers=Array.from({length:5},(_,row)=>({row,x:270,active:false,used:false}));
  this.spawned=0;this.kills=0;this.nextSky=3;this.status='playing';this.waveShown=false;this.events=[];
 }
 get conveyor(){return this.battleMode==='conveyor';}
 get cards(){return this.conveyor?this.belt:this.loadout??this.cfg.cards;}
 equip(cards,capacity=6){if(!Number.isInteger(capacity)||capacity<6||capacity>10||!Array.isArray(cards)||!cards.length||cards.length>capacity||new Set(cards).size!==cards.length||cards.some(id=>!CHARACTERS[id]))throw Error('上阵阵容无效');this.battleMode='normal';this.belt=[];this.loadout=[...cards];this.slotCapacity=capacity;}
 emit(type,data={}){this.events.push({type,...data});}
 reserveIds(max){this.nextId=Math.max(this.nextId,max);}
 place(type,row,col){const c=CHARACTERS[type];if(this.status!=='playing'||!c||!this.cards.includes(type)||!this.cfg.rows.includes(row)||col<0||col>=9||this.plants.some(p=>p.row===row&&p.col===col)||(!this.conveyor&&(this.energy<c.cost||(this.cooldowns[type]||0)>0)))return false;if(this.conveyor)this.belt.splice(this.belt.indexOf(type),1);else{this.energy-=c.cost;this.cooldowns[type]=c.cooldown;}this.plants.push({id:++this.nextId,type,row,col,hp:c.hp,timer:c.role==='producer'?8:c.role==='staff'?c.interval:.4,action:0,windup:0,hit:0,defending:false,spent:false,retireLeft:0,freezeLeft:0,refineLeft:0,burstLeft:0,burstDelay:0,armLeft:c.armTime||0,armed:c.role!=='mine'});this.emit('plant');return true;}
 remove(row,col){if(this.status!=='playing')return false;const n=this.plants.length;this.plants=this.plants.filter(p=>p.row!==row||p.col!==col);return this.plants.length<n;}
 collect(id){if(this.status!=='playing')return false;const i=this.orbs.findIndex(o=>o.id===id);if(i<0)return false;this.energy+=25;this.orbs.splice(i,1);this.emit('collect');return true;}
 collectCoin(id){if(this.status!=='playing')return 0;const i=this.coins.findIndex(c=>c.id===id);if(i<0)return 0;const [coin]=this.coins.splice(i,1);return coin.value;}
 orb(x,y,sky=false){this.orbs.push({id:++this.nextId,x,y:sky?200:y,target:y,life:sky?14:12,sky});}
 damageEnemy(e,amount,kind='projectile'){
  if(e.hp<=0)return;
  if(monsterStats(e).blastLimit&&['fire','mine','ambush'].includes(kind))amount=Math.min(amount,monsterStats(e).blastLimit);
  e.hp=Math.max(0,e.hp-amount);e.hit=.16;
  if(e.hp>0&&e.hp<=monsterStats(e).hp*.5&&!e.damaged){
   e.damaged=true;if((e.type??'frog')==='frog')this.debris.push({kind:'arm',x:e.x+18,row:e.row,age:0,life:2.2});this.emit((e.type??'frog')==='frog'?'limb':'hurt',{id:e.id});
  }
 }
 pickGlobalTarget(){return this.enemies.filter(e=>e.hp>0&&onLawn(e)).sort((a,b)=>Number(!!monsterStats(b).flying)-Number(!!monsterStats(a).flying)||a.x-b.x||a.id-b.id)[0];}
 shoot(p,continuing=false){
  const c=CHARACTERS[p.type],target=c.globalTarget?this.pickGlobalTarget():this.enemies.filter(e=>e.hp>0&&onLawn(e)&&e.row===p.row&&e.x>GRID.x+(p.col+.5)*GRID.cw-15).sort((a,b)=>a.x-b.x)[0];
  if(!target&&(!continuing||c.globalTarget))return false;
  if(c.globalTarget){const x=GRID.x+(p.col+.5)*GRID.cw;p.aimLeft=target.x<x;this.bullets.push({kind:'shot',row:p.row,x:x+(p.aimLeft?-37:37),y:GRID.y+(p.row+.45)*GRID.rh,targetId:target.id,damage:c.damage,life:6});p.action=.28;this.emit('shoot',{id:p.id});return true;}
  this.bullets.push({x:GRID.x+(p.col+.5)*GRID.cw+37,row:p.row,damage:c.damage,lift:target?.type==='bat'?40:0,kind:p.type==='water'?'water':p.type==='erwa'?'gold':'fire'});p.action=.28;this.emit('shoot',{id:p.id});return true;
 }
 castFire(id,row,col){
  if(this.status!=='playing'||!this.cfg.rows.includes(row)||!Number.isInteger(col)||col<0||col>=GRID.cols)return false;
  const p=this.plants.find(p=>p.id===id&&p.type==='nezha'&&p.hp>0&&!p.spent&&!(p.freezeLeft>0));if(!p)return false;
  p.spent=true;p.action=.6;p.retireLeft=.6;
  this.spells.push({id:++this.nextId,kind:'fire',fromX:GRID.x+(p.col+.5)*GRID.cw,fromRow:p.row,row,col,age:0,life:1.25,delay:.35,hit:false,damage:CHARACTERS.nezha.damage});this.emit('cast');return true;
 }
 step(dt){
  if(this.status!=='playing')return;this.time+=dt;if(this.conveyor){this.beltClock=Math.max(0,this.beltClock-dt);if(this.beltClock<=1e-8&&this.belt.length<8){this.belt.push(BELT_SEQUENCE[this.beltCursor++%BELT_SEQUENCE.length]);this.beltClock=4;}}for(const e of this.enemies)e.slowLeft=Math.max(0,(e.slowLeft||0)-dt);
  for(const a of [...this.debris,...this.corpses,...this.spells])a.age+=dt;
  this.debris=this.debris.filter(a=>a.age<a.life);this.corpses=this.corpses.filter(a=>a.age<a.life);this.spells=this.spells.filter(a=>a.age<a.life);
  for(const k in this.cooldowns)this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
  if(!this.conveyor&&this.time>=this.nextSky){this.orb(430+this.random()*850,330+this.random()*450,true);this.nextSky=this.time+7+this.random()*3;}
  while(this.spawned<this.cfg.schedule.length&&this.time>=this.cfg.schedule[this.spawned].t){const s=this.cfg.schedule[this.spawned++];this.enemies.push({id:++this.nextId,row:s.row,x:1600+this.random()*40,type:s.type??'frog',hp:MONSTERS[s.type??'frog'].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:this.random()*6,...(s.type==='snake'?{freezeClock:MONSTERS.snake.freezeInterval,castLeft:0}:{})});this.emit('spawn');}
  if(!this.waveShown&&this.time>=this.cfg.wave){this.waveShown=true;this.emit('wave');}
  for(const p of this.plants)p.freezeLeft=Math.max(0,(p.freezeLeft||0)-dt);
  for(const e of this.enemies)if(e.type==='snake'&&e.hp>0){
   e.castLeft=Math.max(0,(e.castLeft||0)-dt);
   // Count from spawning; no targets means this scheduled cast is skipped.
   e.freezeClock=Math.max(0,(e.freezeClock??MONSTERS.snake.freezeInterval)-dt);
   if(e.freezeClock<1e-8){
    e.freezeClock=MONSTERS.snake.freezeInterval;
    const candidates=this.plants.filter(p=>p.hp>0&&!p.spent&&!(p.freezeLeft>0));
    if(candidates.length){const target=candidates[Math.min(candidates.length-1,Math.floor(this.random()*candidates.length))];target.freezeLeft=MONSTERS.snake.freezeDuration;e.castLeft=.65;this.emit('freeze',{id:e.id,target:target.id});}
   }
  }
  for(const p of this.plants){
   const c=CHARACTERS[p.type];if(p.spent){p.retireLeft=Math.max(0,p.retireLeft-dt);if(p.retireLeft===0)p.hp=0;continue;}if(p.freezeLeft>0)continue;p.action=Math.max(0,p.action-dt);p.hit=Math.max(0,(p.hit||0)-dt);p.defending=false;p.timer-=dt;
   if(c.role==='producer'&&p.timer<=1e-8){this.orb(GRID.x+(p.col+.5)*GRID.cw+20,GRID.y+(p.row+.5)*GRID.rh);p.timer=c.interval;p.action=.85;this.emit('produce');}
   if(c.role==='caster'){
    const x=GRID.x+(p.col+.5)*GRID.cw;
    if(this.enemies.some(e=>e.hp>0&&onLawn(e)&&Math.abs(e.row-p.row)<=1&&Math.abs(e.x-x)<=GRID.cw*1.5))this.castFire(p.id,p.row,p.col);
    continue;
   }
   if(c.role==='staff'){
    const x=GRID.x+(p.col+.5)*GRID.cw,hasTarget=this.enemies.some(e=>e.hp>0&&onLawn(e)&&e.row===p.row&&e.x>=x-15);
    if(p.timer<=1e-8&&hasTarget){this.bullets.push({kind:'staff',x:x+35,row:p.row,damage:c.damage,lift:0});p.timer=c.interval;p.action=.5;this.emit('throw',{id:p.id});}continue;
   }
   if(c.role==='ambusher'){
    const x=GRID.x+(p.col+.5)*GRID.cw;
    const target=this.enemies.filter(e=>e.hp>0&&onLawn(e)&&!monsterStats(e).flying&&e.row===p.row&&e.x>=x-GRID.cw*.5&&e.x<=x+GRID.cw*c.rangeTiles).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
    if(target){p.spent=true;p.action=.8;p.retireLeft=.8;this.spells.push({id:++this.nextId,kind:'ambush',fromX:x,fromRow:p.row,row:p.row,col:Math.min(8,Math.max(0,Math.floor((target.x-GRID.x)/GRID.cw))),targetX:target.x,age:0,life:1.1,delay:.45,hit:false,damage:c.damage});this.emit('ambush',{id:p.id});}
    continue;
   }
   if(c.role==='absorber'){
    if(p.refineLeft>0){p.refineLeft=Math.max(0,p.refineLeft-dt);continue;}
    const x=GRID.x+(p.col+.5)*GRID.cw;
    const target=this.enemies.filter(e=>e.hp>0&&onLawn(e)&&!monsterStats(e).flying&&e.type!=='snake'&&e.row===p.row&&e.x>=x-25&&e.x<=x+c.rangeTiles*GRID.cw).sort((a,b)=>a.x-b.x)[0];
    if(target){target.hp=0;target.absorbed=true;p.refineLeft=c.refineTime;p.action=.6;this.effects.push({kind:'absorb',x:target.x,y:GRID.y+(p.row+.5)*GRID.rh,toX:x+30,toY:GRID.y+(p.row+.45)*GRID.rh,life:.6});this.emit('absorb',{id:p.id,target:target.id});}
    continue;
   }
   if(c.role==='mine'){
    p.armLeft=Math.max(0,p.armLeft-dt);p.armed=p.armLeft===0;
    const x=GRID.x+(p.col+.5)*GRID.cw;
    if(p.armed&&this.enemies.some(e=>e.hp>0&&!monsterStats(e).flying&&onLawn(e)&&e.row===p.row&&Math.abs(e.x-x)<=GRID.cw*.55)){
     p.spent=true;p.retireLeft=.45;p.action=.45;
     for(const e of this.enemies)if(e.hp>0&&!monsterStats(e).flying&&onLawn(e)&&e.row===p.row&&Math.abs(e.x-x)<=GRID.cw*.75)this.damageEnemy(e,c.damage,'mine');
     this.spells.push({id:++this.nextId,kind:'mine',fromX:x,fromRow:p.row,row:p.row,col:p.col,age:0,life:.9,delay:0,hit:true,damage:c.damage});this.emit('mine');
    }
    continue;
   }
   if(c.role!=='shooter')continue;
   const hasTarget=c.globalTarget?!!this.pickGlobalTarget():this.enemies.some(e=>e.hp>0&&onLawn(e)&&e.row===p.row&&e.x>GRID.x+(p.col+.5)*GRID.cw-15);
   if(p.burstLeft>0){p.burstDelay=Math.max(0,p.burstDelay-dt);if(p.burstDelay<1e-8){this.shoot(p,true);p.burstLeft--;p.burstDelay=c.burstGap||0;}continue;}
   if(p.windup>0){
    p.windup=Math.max(0,p.windup-dt);if(p.windup<1e-8)p.windup=0;
    if(p.windup===0){if(hasTarget&&this.shoot(p)){p.timer=c.interval-.2;if(c.burstCount){p.burstLeft=c.burstCount-1;p.burstDelay=c.burstGap;}}else p.timer=0;}
   }else if(p.timer<=1e-8&&hasTarget)p.windup=.2;
  }
  for(const spell of this.spells)if(!spell.hit&&spell.age>=spell.delay){
   spell.hit=true;const x=spell.kind==='ambush'?spell.targetX:GRID.x+(spell.col+.5)*GRID.cw;
   if(spell.kind==='ambush'){for(const e of this.enemies)if(e.hp>0&&onLawn(e)&&!monsterStats(e).flying&&e.row===spell.row&&Math.abs(e.x-x)<=GRID.cw*.75)this.damageEnemy(e,spell.damage,'ambush');this.emit('blast');continue;}
   for(const e of this.enemies)if(e.hp>0&&onLawn(e)&&Math.abs(e.row-spell.row)<=1&&Math.abs(e.x-x)<GRID.cw*1.5)this.damageEnemy(e,spell.damage,spell.kind);
   this.emit('blast');
  }
  for(const staff of this.staves){
   staff.tickClock+=dt;staff.life=Math.max(0,staff.life-dt);
   while(staff.tickClock>=1-1e-8&&staff.ticks<5){staff.tickClock=Math.max(0,staff.tickClock-1);staff.ticks++;for(const e of this.enemies)if(e.hp>0&&onLawn(e)&&e.row===staff.row&&Math.abs(e.x-staff.x)<=GRID.cw*.75)this.damageEnemy(e,50);this.emit('staffHit');}
  }
  this.staves=this.staves.filter(s=>s.life>1e-8);
  for(const b of this.bullets){
   if(b.kind==='shot'){
    b.life-=dt;let target=this.enemies.find(e=>e.id===b.targetId&&e.hp>0&&onLawn(e));if(!target){target=this.pickGlobalTarget();if(target)b.targetId=target.id;}
    if(!target||b.life<=0){b.dead=true;continue;}
    const y=GRID.y+(target.row+.45)*GRID.rh-(monsterStats(target).flying?40:0),dx=target.x-b.x,dy=y-b.y,d=Math.hypot(dx,dy),travel=480*dt;
    b.angle=Math.atan2(dy,dx);if(d<=travel+14){this.damageEnemy(target,b.damage);b.dead=true;this.effects.push({x:target.x,y,life:.22,kind:'shot'});}else{b.x+=dx/d*travel;b.y+=dy/d*travel;}continue;
   }
   const prev=b.x;b.x+=330*dt;const e=this.enemies.filter(e=>e.hp>0&&onLawn(e)&&e.row===b.row&&e.x+25>=prev&&e.x-25<=b.x).sort((a,b)=>a.x-b.x)[0];if(e){if(b.kind==='staff'){this.staves.push({id:++this.nextId,row:b.row,x:e.x,life:5,tickClock:0,ticks:0});b.dead=true;this.emit('staffImpact');continue;}this.damageEnemy(e,b.damage);if(b.kind==='water'){e.slowLeft=CHARACTERS.water.slowDuration;e.slowFactor=CHARACTERS.water.slowFactor;}b.dead=true;this.effects.push({x:e.x,y:GRID.y+(e.row+.5)*GRID.rh,life:.22,kind:b.kind});}}
  this.bullets=this.bullets.filter(b=>!b.dead&&(b.kind==='shot'?b.life>0:b.x<=LAWN_RIGHT));
  for(const e of this.enemies){
   if(e.hp<=0)continue;e.hit=Math.max(0,(e.hit||0)-dt);
   const p=this.plants.filter(p=>!monsterStats(e).flying&&onLawn(e)&&p.hp>0&&!p.spent&&p.type!=='six'&&p.row===e.row&&Math.abs(e.x-(GRID.x+(p.col+.5)*GRID.cw))<65).sort((a,b)=>b.col-a.col)[0];
   e.eating=!!p;
   if(p){
    p.defending=true;e.attackClock=(e.attackClock||0)+dt*(e.slowLeft>0?e.slowFactor:1);
    // A discrete impact aligned with each monster's attack pose.
    if(e.attackClock>=(monsterStats(e).attackImpact??.42)-1e-8&&!e.attackHasHit){p.hp=Math.max(0,p.hp-monsterStats(e).attack);p.hit=.2;e.attackHasHit=true;this.emit('strike',{id:e.id,target:p.id});}
    if(e.attackClock>=(monsterStats(e).attackInterval??1)-1e-8){e.attackClock=Math.max(0,e.attackClock-(monsterStats(e).attackInterval??1));e.attackHasHit=false;}
   }else{e.attackClock=0;e.attackHasHit=false;e.x-=monsterSpeed(e)*dt*(e.slowLeft>0?e.slowFactor:1);}
   const m=this.mowers[e.row];if(e.x<325&&!m.used){m.active=true;m.used=true;this.emit('mower');}if(e.x<210&&!m.active){this.status='lost';this.emit('lost');}
  }
  for(const m of this.mowers)if(m.active){m.x+=600*dt;for(const e of this.enemies)if(e.row===m.row&&e.x<m.x+65&&e.x>m.x-120)e.hp=0;if(m.x>1760)m.active=false;}
  for(const e of this.enemies)if(e.hp<=0){
   this.kills++;if(this.random()<.35)this.coins.push({id:++this.nextId,x:Math.max(GRID.x,Math.min(LAWN_RIGHT,e.x)),y:GRID.y+(e.row+.65)*GRID.rh,value:this.random()<.2?50:10,life:20});if(!e.absorbed)this.corpses.push({type:e.type??'frog',damaged:!!e.damaged,x:e.x,row:e.row,age:0,life:1.65});
   if(!e.absorbed&&(e.type??'frog')==='frog')this.debris.push({kind:'head',x:e.x-8,row:e.row,age:0,life:1.65});
   if(!e.absorbed&&!e.damaged&&(e.type??'frog')==='frog')this.debris.push({kind:'arm',x:e.x+18,row:e.row,age:0,life:1.65});
   this.emit('kill',{id:e.id});
  }
  this.enemies=this.enemies.filter(e=>e.hp>0);this.plants=this.plants.filter(p=>p.hp>0);
  for(const o of this.orbs){o.life-=dt;if(o.sky)o.y=Math.min(o.target,o.y+70*dt);}this.orbs=this.orbs.filter(o=>o.life>0);
  for(const c of this.coins)c.life-=dt;this.coins=this.coins.filter(c=>c.life>0);
  for(const f of this.effects)f.life-=dt;this.effects=this.effects.filter(f=>f.life>0);
  // Death effects finish before a victory overlay freezes the field.
  if(this.status==='playing'&&this.spawned===this.cfg.schedule.length&&!this.enemies.length&&!this.corpses.length&&!this.spells.length&&!this.plants.some(p=>p.type==='seven'&&p.action>0)){this.status='won';this.emit('won');}
 }
}
