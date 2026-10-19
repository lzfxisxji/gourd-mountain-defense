import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
const advance=(g,t)=>{for(let n=0;n<Math.round(t*20);n++)g.step(.05);};
const setup=()=>{const g=new Game(10,()=>.99);g.cfg={...g.cfg,schedule:[]};g.energy=10000;g.enemies.push({id:++g.nextId,type:'snake',row:0,x:1400,hp:1000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0,freezeClock:40,castLeft:0});return g;};
test('snake freezes exactly one randomly selected living actor every 40 seconds',()=>{
 const g=setup();g.place('wall',2,0);g.place('tall',3,0);advance(g,39.9);assert.ok(g.plants.every(p=>!p.freezeLeft));advance(g,.1);assert.equal(g.plants.filter(p=>p.freezeLeft>0).length,1);assert.equal(g.plants[1].freezeLeft,8);
 assert.equal(g.events.filter(e=>e.type==='freeze').length,1);advance(g,8.1);assert.ok(g.plants.every(p=>!p.freezeLeft));advance(g,31.9);assert.equal(g.events.filter(e=>e.type==='freeze').length,2);
});
test('frozen producer, shooter, mine and manual caster pause actions then recover',()=>{
 const g=setup();for(const [i,type]of ['vine','fire','pangolin','nezha'].entries())g.place(type,2,i);
 for(const p of g.plants){p.freezeLeft=2;p.timer=.1;}const vine=g.plants[0],shooter=g.plants[1],mine=g.plants[2],caster=g.plants[3];mine.armLeft=1;shooter.windup=.15;
 assert.equal(g.castFire(caster.id,2,5),false);advance(g,1);assert.equal(vine.timer,.1);assert.equal(shooter.windup,.15);assert.equal(mine.armLeft,1);assert.equal(g.spells.length,0);advance(g,1.3);assert.ok(vine.timer>20);assert.ok(mine.armLeft<1);assert.equal(g.castFire(caster.id,2,5),true);
});
test('no-target casts skip safely and dead snakes never cast',()=>{
 const g=setup();g.enemies[0].freezeClock=.05;g.step(.05);assert.equal(g.enemies[0].freezeClock,40);assert.equal(g.events.filter(e=>e.type==='freeze').length,0);g.place('wall',2,0);g.enemies[0].hp=0;g.enemies[0].freezeClock=0;g.step(.05);assert.equal(g.plants[0].freezeLeft,0);
});
test('save resumes frozen actor and snake cooldown without resetting; legacy fields are optional',()=>{
 const g=new Game(10);g.place('fire',2,0);g.plants[0].freezeLeft=5.2;
 g.enemies.push({id:++g.nextId,type:'snake',row:0,x:1400,hp:1000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0,freezeClock:13.5,castLeft:.4});
 const h=restoreGame(snapshotGame(g));assert.equal(h.plants[0].freezeLeft,5.2);assert.equal(h.enemies[0].freezeClock,13.5);advance(g,1);advance(h,1);assert.deepEqual(snapshotGame(g),snapshotGame(h));
 const old=snapshotGame(g);delete old.plants[0].freezeLeft;delete old.enemies[0].freezeClock;delete old.enemies[0].castLeft;assert.doesNotThrow(()=>restoreGame(old));old.plants[0].freezeLeft=99;assert.throws(()=>restoreGame(old));
});
