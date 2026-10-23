import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS,LEVELS,monsterScale,monsterSpeed} from '../src/engine.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const setup=()=>{const g=new Game(8),e={id:++g.nextId,type:'centipede',row:2,x:1050,hp:600,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return {g,e};};
test('centipede transforms exactly at half health and gains only 25 percent movement speed',()=>{
 const {g,e}=setup();assert.equal(MONSTERS.centipede.hp,600);assert.equal(monsterScale(e),1);assert.equal(monsterSpeed(e),18);
 g.damageEnemy(e,299);assert.equal(e.hp,301);assert.equal(monsterScale(e),1);g.damageEnemy(e,1);assert.equal(e.hp,300);assert.equal(monsterScale(e),2);assert.equal(monsterSpeed(e),22.5);
 const x=e.x;advance(g,1);assert.ok(Math.abs(e.x-(x-22.5))<1e-7);g.damageEnemy(e,20);assert.equal(monsterScale(e),2);assert.equal(g.debris.length,0);
});
test('centipede axe deals 200 per impact before and after transformation',()=>{
 for(const rage of [false,true]){const {g,e}=setup();g.energy=100;g.place('wall',2,5);e.x=GRID.x+5.5*GRID.cw+50;if(rage)g.damageEnemy(e,300);
 advance(g,.41);assert.equal(g.plants[0].hp,4000);advance(g,.01);assert.equal(g.plants[0].hp,3800);advance(g,.99);assert.equal(g.plants[0].hp,3800);advance(g,.01);assert.equal(g.plants[0].hp,3600);}
});
test('water slows enraged centipede; enlarged form and pending attack survive save',()=>{
 const {g,e}=setup();g.damageEnemy(e,300);e.slowLeft=10;e.slowFactor=.5;const x=e.x;advance(g,1);assert.ok(Math.abs(e.x-(x-11.25))<1e-7);
 g.energy=100;g.place('wall',2,5);e.x=GRID.x+5.5*GRID.cw+50;advance(g,.5);const h=restoreGame(snapshotGame(g));assert.equal(monsterScale(h.enemies[0]),2);advance(g,2);advance(h,2);assert.deepEqual(snapshotGame(g),snapshotGame(h));
});
test('centipede spawns only from 1-8; lethal burst has no surviving transformation or frog debris',()=>{
 for(const [level,cfg]of Object.entries(LEVELS).filter(([id])=>+id<=10))assert.equal(cfg.schedule.filter(s=>s.type==='centipede').length,+level>=8?2:0);
 const {g,e}=setup();g.damageEnemy(e,1800,'mine');g.step(.01);assert.equal(g.enemies.length,0);assert.equal(g.corpses[0].type,'centipede');assert.equal(g.debris.length,0);
});
