import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS,LEVELS} from '../src/engine.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
import {enemyPose} from '../src/animation.js';
const bat=(g,x=900)=>{const e={id:++g.nextId,type:'bat',row:2,x,hp:300,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
test('bat has 1.5 times frog health, distinct wingbeat, and only enters late levels',()=>{
 assert.equal(MONSTERS.bat.hp,MONSTERS.frog.hp*1.5);assert.equal(enemyPose({type:'bat'},0),'batFlyA');assert.equal(enemyPose({type:'bat'},.21),'batFlyB');
 for(const level of [1,2,3,4,5])assert.ok(!LEVELS[level].schedule.some(s=>s.type==='bat'));
 for(const level of [6,7])assert.ok(LEVELS[level].schedule.some(s=>s.type==='bat'));
 const g=new Game(6);g.step(100);assert.equal(g.enemies.find(e=>e.type==='bat').hp,300);
});
test('flight bypasses tall defender and armed mine without attacking or detonating it',()=>{
 const g=new Game(7);g.energy=1000;g.place('tall',2,3);g.place('pangolin',2,4);const mine=g.plants[1];mine.armLeft=0;mine.armed=true;
 const e=bat(g,GRID.x+4.5*GRID.cw);g.step(.5);assert.equal(e.hp,300);assert.equal(mine.spent,false);assert.equal(e.eating,false);
 e.x=GRID.x+3.5*GRID.cw;const x=e.x;g.step(.5);assert.equal(g.plants[0].hp,8000);assert.ok(e.x<x);assert.equal(e.eating,false);
});
test('fifteen fire hits kill bat; it falls whole without frog limbs',()=>{
 const g=new Game(7),e=bat(g);for(let i=0;i<14;i++)g.damageEnemy(e,20);assert.equal(e.hp,20);assert.equal(g.debris.length,0);
 g.damageEnemy(e,20);g.step(.05);assert.equal(g.enemies.length,0);assert.equal(g.corpses[0].type,'bat');assert.equal(g.debris.length,0);
});
test('water slows flight, Nezha hits flyers and a saved 300-health bat restores',()=>{
 const g=new Game(7),e=bat(g);const h=restoreGame(snapshotGame(g));assert.equal(h.enemies[0].hp,300);assert.equal(h.enemies[0].type,'bat');
 g.bullets.push({row:2,x:860,damage:20,kind:'water'});g.step(.05);assert.equal(e.hp,280);assert.equal(e.slowLeft,10);const x=e.x;g.step(.5);assert.ok(Math.abs(e.x-(x-5))<.001);
 g.energy=1000;g.place('nezha',2,0);g.castFire(g.plants[0].id,2,4);e.x=GRID.x+4.5*GRID.cw;g.step(.4);assert.equal(e.hp,0);
 const legacy=snapshotGame(new Game(1));legacy.enemies=[{...h.enemies[0],hp:200}];delete legacy.enemies[0].type;legacy.nextId=1;assert.equal(restoreGame(legacy).enemies[0].hp,200);
});
