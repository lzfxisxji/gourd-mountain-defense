import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS} from '../src/engine.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const enemy=(g,type='frog',row=2,x=900)=>{const e={id:++g.nextId,type,row,x,hp:MONSTERS[type].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
test('seven absorbs one nearest ground enemy, refines, then can absorb again',()=>{
 const g=new Game(8);g.cfg={...g.cfg,schedule:[]};g.place('seven',2,3);const x=GRID.x+3.5*GRID.cw,a=enemy(g,'frog',2,x+75),b=enemy(g,'frog',2,x+110);g.step(.01);assert.equal(a.hp,0);assert.equal(b.hp,200);assert.equal(g.kills,1);assert.equal(g.corpses.length,0);assert.equal(g.plants[0].refineLeft,42);assert.ok(g.effects.some(e=>e.kind==='absorb'));
 // Keep the next foe far away while the gourd refines, then return it to range.
 b.x=1700;advance(g,41);assert.ok(g.plants[0].refineLeft>0);assert.equal(b.hp,200);advance(g,1.1);b.x=x+90;g.step(.01);assert.equal(b.hp,0);
});
test('seven cannot absorb flying/boss enemies, other lanes, off-lawn or behind',()=>{
 for(const [type,row,x]of [['bat',2,900],['snake',2,900],['frog',1,900],['frog',2,1600],['frog',2,700]]){const g=new Game(8);g.place('seven',2,4);const e=enemy(g,type,row,x);g.step(.01);assert.ok(e.hp>0);assert.equal(g.plants[0].refineLeft,0);}
});
test('refining freezes and a restored half-refined gourd keeps its remaining time',()=>{
 const g=new Game(8);g.place('seven',2,3);enemy(g,'frog',2,GRID.x+3.5*GRID.cw+70);g.step(.01);g.plants[0].freezeLeft=2;advance(g,1);assert.equal(g.plants[0].refineLeft,42);
 const h=restoreGame(snapshotGame(g));assert.equal(h.plants[0].refineLeft,42);advance(g,.5);advance(h,.5);assert.deepEqual(snapshotGame(g),snapshotGame(h));
});
test('erwa fires two spaced gold rounds per attack; a mid-burst save resumes the second',()=>{
 const g=new Game(9);g.energy=200;g.place('erwa',2,0);enemy(g);advance(g,.61);assert.equal(g.bullets.length,1);assert.equal(g.bullets[0].kind,'gold');assert.equal(g.bullets[0].damage,20);assert.equal(g.plants[0].burstLeft,1);
 const h=restoreGame(snapshotGame(g));advance(g,.16);advance(h,.16);assert.equal(g.bullets.length,2);assert.equal(g.plants[0].burstLeft,0);assert.deepEqual(snapshotGame(g),snapshotGame(h));
});
