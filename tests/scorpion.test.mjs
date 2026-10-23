import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS,LEVELS} from '../src/engine.js';
import {enemyPose} from '../src/animation.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const setup=()=>{
 const g=new Game(9);g.energy=1000;g.place('wall',2,4);
 const e={id:++g.nextId,type:'scorpion',row:2,x:GRID.x+4.5*GRID.cw+50,hp:2000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return {g,e,p:g.plants[0]};
};
test('scorpion deals discrete 2000 damage after windup, then repeats every 3 seconds',()=>{
 const {g,e,p}=setup();assert.equal(MONSTERS.scorpion.hp,2000);
 advance(g,.89);assert.equal(p.hp,4000);assert.equal(enemyPose(e,g.time),'scorpionWindup');
 advance(g,.01);assert.equal(p.hp,2000);assert.equal(enemyPose(e,g.time),'scorpionSlash');
 advance(g,2.99);assert.equal(p.hp,2000);advance(g,.01);assert.equal(p.hp,0);assert.equal(g.plants.length,0);
 assert.equal(g.events.filter(e=>e.type==='strike').length,2);
});
test('scorpion walks slowly, stops at a defender, and water slows both movement and attack',()=>{
 const {g,e,p}=setup();g.plants=[];const x=e.x;advance(g,1);assert.ok(Math.abs(e.x-(x-8))<1e-6);
 e.slowLeft=10;e.slowFactor=.5;const slowX=e.x;advance(g,1);assert.ok(Math.abs(e.x-(slowX-4))<1e-6);
 g.plants=[p];e.x=GRID.x+4.5*GRID.cw+50;const stopped=e.x;advance(g,1.79);assert.equal(p.hp,4000);assert.equal(e.x,stopped);advance(g,.01);assert.equal(p.hp,2000);
});
test('scorpion attack before/after impact resumes exactly once through saves',()=>{
 for(const t of [.65,1.7,2.95]){const {g}=setup();advance(g,t);const h=restoreGame(snapshotGame(g));advance(g,1.2);advance(h,1.2);assert.deepEqual(snapshotGame(g),snapshotGame(h));}
});
test('scorpion takes ordinary damage, uses its own death sprite, and spawns in levels 9 and 10',()=>{
 const {g,e}=setup();g.damageEnemy(e,1800,'mine');assert.equal(e.hp,200);g.damageEnemy(e,200);g.step(.01);assert.equal(g.corpses[0].type,'scorpion');assert.equal(g.debris.length,0);
 for(const [id,cfg]of Object.entries(LEVELS).filter(([id])=>+id<=10)){const n=cfg.schedule.filter(s=>s.type==='scorpion').length;assert.equal(n,Number(id)>=9?2:0);}
 const battle=new Game(9),i=battle.cfg.schedule.findIndex(s=>s.type==='scorpion');battle.spawned=i;battle.time=battle.cfg.schedule[i].t-.01;battle.step(.02);assert.equal(battle.enemies.find(e=>e.type==='scorpion').hp,2000);
});
