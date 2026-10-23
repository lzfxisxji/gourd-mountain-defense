import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,CHARACTERS} from '../src/engine.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
import {plantPose} from '../src/animation.js';
const step=(g,t)=>{for(let i=0;i<Math.round(t*20);i++)g.step(.05);};
function setup(){const g=new Game(11);g.equip(['beta']);g.energy=1000;assert.ok(g.place('beta',4,0));g.cfg={...g.cfg,schedule:[{t:999,row:0}]};return g;}
function foe(g,row,col,type='scorpion'){const e={id:++g.nextId,type,row,x:GRID.x+(col+.5)*GRID.cw,hp:type==='bat'?300:2000,hit:0,phase:0,damaged:false,attackClock:0,attackHasHit:false};g.enemies.push(e);return e;}
test('Beta waits twenty seconds and fires at the densest global 3x3 cluster, including air targets',()=>{
 const g=setup();step(g,19.95);const p=g.plants[0];assert.equal(g.spells.length,0);const enemies=[foe(g,0,6),foe(g,1,6),foe(g,1,7),foe(g,0,7,'bat')],isolated=foe(g,4,8);
 step(g,.05);assert.equal(g.spells.length,1);const s=g.spells[0];assert.equal(s.kind,'shell');assert.equal(p.timer,20);assert.equal(plantPose(p),'betaFire');assert.ok(s.row<=1);assert.ok(s.col>=6);assert.equal(s.hit,false);assert.equal(isolated.hp,2000);
 step(g,.9);assert.equal(s.hit,true);for(const e of enemies)assert.equal(e.hp,e.type==='bat'?0:1700);assert.equal(isolated.hp,2000);assert.equal(g.enemies.some(e=>e.type==='bat'),false);
});
test('artillery waits without targets, ignores off-lawn/dead targets and freeze pauses its reload',()=>{
 const g=setup();step(g,22);assert.equal(g.spells.length,0);const outside=foe(g,0,9);foe(g,0,5).hp=0;step(g,.05);assert.equal(g.spells.length,0);outside.x=1300;g.plants[0].freezeLeft=1;const timer=g.plants[0].timer;step(g,.5);assert.equal(g.plants[0].timer,timer);assert.equal(g.spells.length,0);step(g,.55);assert.equal(g.spells.length,1);
});
test('mid-flight artillery and reload restore exactly, damage happens once and next shot waits twenty seconds',()=>{
 const g=setup();step(g,20);foe(g,1,6);step(g,.2);assert.equal(g.spells.length,1);const h=restoreGame(snapshotGame(g));h.cfg=g.cfg;step(g,.8);step(h,.8);assert.deepEqual(snapshotGame(g),snapshotGame(h));assert.equal(g.enemies[0].hp,1700);step(g,.5);assert.equal(g.enemies[0].hp,1700);step(g,18);assert.equal(g.spells.length,0);step(g,1);assert.equal(g.spells.length,1);assert.equal(CHARACTERS.beta.interval,20);
});
