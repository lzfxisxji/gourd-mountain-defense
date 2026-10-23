import test from 'node:test';import assert from 'node:assert/strict';
import {Game,GRID,CHARACTERS,MONSTERS,isCharmed} from '../src/engine.js';
import {claimDaily,DAILY_REWARDS} from '../src/checkin.js';
import {snapshotGame,restoreGame,emptySave,encodeSave,decodeSave} from '../src/storage.js';
import {isCharacterUnlocked} from '../src/roster.js';
const step=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
function setup(deck=['shuke']){const g=new Game(11);g.cfg={...g.cfg,schedule:[{t:999,row:0}]};g.equip(deck);g.energy=10000;return g;}
function foe(g,type='frog',x=1000,row=2){const e={id:++g.nextId,type,x,row,hp:MONSTERS[type].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;}
const drop=(g,kind,targetX=1000,row=2)=>g.resolveAirdrop({kind,targetX,row});
test('fourth cumulative claim unlocks Shuke once; old fourth-day saves gain him without losing their coins',()=>{
 const s=emptySave();for(let day=1;day<=4;day++)assert.ok(claimDaily(s,new Date(`2026-10-0${day}T12:00:00+08:00`)));
 assert.equal(DAILY_REWARDS[3].character,'shuke');assert.equal(s.coins,7000);assert.equal(s.unlocks.shuke,true);assert.equal(isCharacterUnlocked('shuke',0,s.unlocks),true);assert.equal(claimDaily(s,new Date('2026-10-04T20:00:00+08:00')),false);
 const old={...s,coins:12000,unlocks:{blackcat:false,wukong:false,beta:true}};const migrated=decodeSave(JSON.stringify(old));assert.equal(migrated.unlocks.shuke,true);assert.equal(migrated.coins,12000);assert.equal(decodeSave(encodeSave(migrated)).coins,12000);
 const g=setup();g.place('shuke',2,0);const locked={...emptySave(),completed:10,battle:snapshotGame(g)};assert.throws(()=>encodeSave(locked));assert.ok(encodeSave({...s,completed:10,battle:snapshotGame(g)}));
});
test('airdrop launches every four seconds, targets its own lane and uses exactly 40/40/20 partitions',()=>{
 const counts={net:0,stone:0,mushroom:0};for(let n=0;n<100;n++){const g=setup();g.place('shuke',2,0);g.nextSky=999;g.random=()=>(n+.5)/100;foe(g);foe(g,'frog',700,1);step(g,3.99);assert.equal(g.spells.length,0);step(g,.01);const spell=g.spells[0];counts[spell.kind]++;assert.equal(spell.row,2);assert.equal(spell.hit,false);assert.equal(spell.damage,spell.kind==='mushroom'?0:spell.kind==='net'?CHARACTERS.fire.damage:50);assert.equal(g.plants[0].timer,4);}
 assert.deepEqual(counts,{net:40,stone:40,mushroom:20});const g=setup();g.place('shuke',2,0);foe(g,'frog',1600);foe(g,'frog',1000,1);step(g,5);assert.equal(g.spells.length,0);
});
test('net deals one flame hit in a one-row two-tile area and blocks movement, melee and snake casting for four seconds',()=>{
 const g=setup(['wall']);g.place('wall',2,5);const snake=foe(g,'snake',1010),bat=foe(g,'bat',1115),outside=foe(g,'frog',1300),otherLane=foe(g,'frog',1000,1);snake.freezeClock=.1;
 drop(g,'net');assert.equal(snake.hp,980);assert.equal(bat.hp,280);assert.equal(outside.hp,200);assert.equal(otherLane.hp,200);assert.equal(snake.netLeft,4);
 const x=snake.x,hp=g.plants[0].hp;step(g,3.9);assert.equal(snake.x,x);assert.equal(g.plants[0].hp,hp);assert.ok(Math.abs(snake.freezeClock-.1)<1e-8);assert.equal(g.plants[0].freezeLeft,0);step(g,.2);assert.equal(snake.netLeft,0);assert.ok(snake.freezeClock<.1||g.plants[0].freezeLeft>0);
});
test('stone deals fifty once and knocks a living target exactly half a tile without hitting another lane',()=>{
 const g=setup(),e=foe(g),other=foe(g,'frog',1000,1);drop(g,'stone');assert.equal(e.hp,150);assert.equal(e.x,1000+GRID.cw/2);assert.equal(other.hp,200);assert.equal(e.attackClock,0);
 e.hp=40;drop(g,'stone',e.x);assert.equal(e.hp,0);assert.equal(e.x,1062);
});
test('mushroom changes sides for ten seconds, fights enemy monsters and neither attacks plants nor triggers carts',()=>{
 const g=setup(['wall']);g.place('wall',2,5);const ally=foe(g,'scorpion',1010),enemy=foe(g,'frog',1060);drop(g,'mushroom',1010);assert.equal(ally.charmLeft,10);step(g,1);assert.equal(enemy.hp,0);assert.equal(g.plants[0].hp,4000);assert.equal(g.mowers[2].used,false);assert.ok(ally.hp<2000);
 const h=setup(['wall']);h.place('wall',2,5);const lone=foe(h,'frog',1010);drop(h,'mushroom',1010);step(h,9.9);assert.equal(isCharmed(lone),true);assert.ok(lone.x>1010);step(h,.2);assert.equal(isCharmed(lone),false);const x=lone.x;step(h,.2);assert.ok(lone.x<x);
});
test('defenders, bullets, area attacks and carts ignore charmed monsters; helicopter is not eaten by ground melee',()=>{
 const g=setup(['shuke','fire','blackcat']);g.place('shuke',2,0);g.place('fire',2,1);g.place('blackcat',1,1);const e=foe(g,'snake',800);drop(g,'mushroom',800);assert.equal(g.pickGlobalTarget(),undefined);assert.equal(g.pickArtilleryTarget(),null);
 g.bullets.push({x:790,row:2,damage:20,lift:0,kind:'fire'},{x:790,y:560,row:2,damage:20,kind:'shot',targetId:e.id,life:6});g.spells.push({id:++g.nextId,kind:'fire',fromX:500,fromRow:2,row:2,col:3,age:.4,life:1.2,delay:.35,hit:false,damage:1800});g.mowers[2].active=true;g.mowers[2].used=true;g.mowers[2].x=780;step(g,.1);assert.equal(e.hp,1000);assert.equal(g.plants.filter(p=>p.type==='fire'||p.type==='blackcat').every(p=>p.action===0),true);
 const h=setup();h.place('shuke',2,0);foe(h,'frog',410);step(h,1);assert.equal(h.plants[0].hp,300);
});
test('net, charm, in-flight drops and seeded random supply all resume through saves; invalid statuses reject',()=>{
 const g=setup();g.place('shuke',2,0);const e=foe(g,'scorpion');drop(g,'net');e.charmLeft=3;const target=foe(g,'snake',1200);step(g,4.1);assert.equal(g.spells.length,1);const h=restoreGame(snapshotGame(g));h.cfg=g.cfg;step(g,1);step(h,1);assert.deepEqual(snapshotGame(g),snapshotGame(h));
 for(const field of ['netLeft','charmLeft']){const invalid=snapshotGame(g);invalid.enemies[0][field]=11;assert.throws(()=>restoreGame(invalid));}
 const old=snapshotGame(g);for(const monster of old.enemies){delete monster.netLeft;delete monster.charmLeft;}assert.ok(restoreGame(old));assert.ok(target.hp>0);
});
test('a charmed final enemy can depart safely and complete the wave without a false loss or duplicate kill',()=>{
 const g=setup();g.cfg={...g.cfg,schedule:[]};const e=foe(g,'frog',GRID.x+9*GRID.cw+79);e.charmLeft=10;step(g,.2);assert.equal(g.status,'won');assert.equal(g.kills,1);assert.equal(g.corpses.length,0);assert.equal(g.coins.length,0);assert.equal(g.enemies.length,0);
});
