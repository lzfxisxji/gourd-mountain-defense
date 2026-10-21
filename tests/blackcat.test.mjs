import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS} from '../src/engine.js';
import {emptySave,encodeSave,decodeSave,snapshotGame,restoreGame} from '../src/storage.js';
import {buyBlackcat,BLACKCAT_PRICE} from '../src/economy.js';
import {isCharacterUnlocked} from '../src/roster.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const enemy=(g,type,row,x)=>{const e={id:++g.nextId,type,row,x,hp:MONSTERS[type].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
const setup=()=>{const g=new Game(10);g.equip(['blackcat']);g.energy=225;assert.ok(g.place('blackcat',2,4));return g;};
test('cat deploys directly on ordinary land and selects air targets across rows first',()=>{
 const g=setup();enemy(g,'frog',2,800);const air=enemy(g,'bat',0,1300);advance(g,.61);assert.equal(g.energy,0);assert.equal(g.bullets[0].kind,'shot');assert.equal(g.bullets[0].targetId,air.id);advance(g,.16);assert.equal(g.bullets.length,2);
});
test('guided bullets reach behind/other lanes; defeated targets are reacquired',()=>{
 const g=setup(),a=enemy(g,'bat',0,1000),b=enemy(g,'frog',4,650);advance(g,.61);assert.equal(g.bullets[0].targetId,a.id);a.hp=0;advance(g,.02);assert.equal(g.bullets[0].targetId,b.id);advance(g,1);assert.ok(b.hp<200);assert.equal(g.plants[0].aimLeft,true);
});
test('off-lawn targets are ignored; homing ends safely when no target remains',()=>{
 const g=setup(),e=enemy(g,'frog',0,1600);advance(g,.7);assert.equal(g.bullets.length,0);e.x=1300;advance(g,.3);assert.ok(g.bullets.length>0);e.hp=0;advance(g,.02);assert.equal(g.bullets.length,0);
});
test('shop purchase is paid once, persists, gates lineup imports and migrates legacy saves',()=>{
 const s=emptySave();assert.equal(buyBlackcat(s),false);s.coins=BLACKCAT_PRICE;assert.ok(buyBlackcat(s));assert.equal(s.coins,0);assert.equal(buyBlackcat(s),false);assert.equal(isCharacterUnlocked('blackcat',0,s.unlocks),true);assert.deepEqual(decodeSave(encodeSave(s)).unlocks,s.unlocks);
 const g=setup();enemy(g,'bat',0,1300);advance(g,.61);s.battle=snapshotGame(g);const h=restoreGame(decodeSave(encodeSave(s)).battle);assert.equal(h.bullets[0].kind,'shot');advance(g,.5);advance(h,.5);assert.deepEqual(snapshotGame(g),snapshotGame(h));
 s.unlocks.blackcat=false;assert.throws(()=>encodeSave(s));const old=emptySave();delete old.unlocks;assert.equal(decodeSave(JSON.stringify(old)).unlocks.blackcat,false);
});
