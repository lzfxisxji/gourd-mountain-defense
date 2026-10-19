import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,LEVELS} from '../src/engine.js';
import {isCharacterUnlocked} from '../src/roster.js';
import {snapshotGame,restoreGame,decodeSave,emptySave,encodeSave} from '../src/storage.js';
const advance=(g,seconds)=>{for(let i=0;i<Math.round(seconds*20);i++)g.step(.05);};
const x=col=>GRID.x+(col+.5)*GRID.cw;
const enemy=(g,row,col,offset=0)=>{const e={id:++g.nextId,row,x:x(col)+offset,hp:200,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
test('Nezha waits, manually fires a targeted 3x3 and retires after a single use',()=>{
 const g=new Game(4);assert.ok(g.place('nezha',2,0));advance(g,2);assert.equal(g.spells.length,0);const p=g.plants[0];
 const inside=[enemy(g,1,3),enemy(g,2,4),enemy(g,3,5)],outside=[enemy(g,0,4),enemy(g,2,6)];
 assert.equal(g.castFire(p.id,2,4),true);assert.equal(g.castFire(p.id,2,4),false);advance(g,.4);
 for(const e of inside)assert.equal(e.hp,0);for(const e of outside)assert.equal(e.hp,200);
 assert.equal(g.kills,3);advance(g,.3);assert.ok(!g.plants.some(a=>a.id===p.id));assert.ok(g.cooldowns.nezha>40);
});
test('nearby enemies trigger immediately, but distant and off-lawn enemies do not',()=>{
 const g=new Game(4);g.place('nezha',2,6);const p=g.plants[0];enemy(g,0,6);enemy(g,2,8,150);g.step(.05);assert.equal(g.spells.length,0);
 enemy(g,1,7);g.step(.05);assert.equal(g.spells.length,1);assert.equal(p.spent,true);assert.equal(g.spells[0].row,2);assert.equal(g.spells[0].col,6);advance(g,1);assert.equal(g.events.filter(e=>e.type==='cast').length,1);
});
test('fire targeting clips edges, refuses invalid targets and never damages friends',()=>{
 const g=new Game(4);g.place('nezha',0,0);const id=g.plants[0].id;assert.equal(g.castFire(id,-1,0),false);assert.equal(g.castFire(id,0,9),false);assert.equal(g.castFire(id,0,1.5),false);
 const target=enemy(g,1,1),far=enemy(g,2,1);g.energy=100;g.place('fire',1,0);assert.ok(g.castFire(id,0,0));advance(g,.4);assert.equal(target.hp,0);assert.equal(far.hp,200);assert.equal(g.plants.find(p=>p.type==='fire').hp,300);
});
test('pangolin arms underground then ambushes nearby same-row foes once',()=>{
 const g=new Game(5);g.place('pangolin',2,4);const p=g.plants[0];advance(g,13);assert.equal(p.armed,false);assert.ok(p.armLeft>0);advance(g,1.1);assert.equal(p.armed,true);
 const a=enemy(g,2,4,35),b=enemy(g,2,4,80),other=enemy(g,1,4);g.step(.05);assert.equal(a.hp,0);assert.equal(b.hp,0);assert.equal(other.hp,200);assert.equal(g.spells[0].kind,'mine');advance(g,.5);assert.ok(!g.plants.some(q=>q.id===p.id));assert.equal(g.events.filter(e=>e.type==='mine').length,1);
});
test('unarmed pangolin is vulnerable and cannot explode prematurely',()=>{
 const g=new Game(5);g.place('pangolin',2,2);const p=g.plants[0],e=enemy(g,2,2,45);advance(g,.5);assert.equal(p.hp,200);assert.equal(e.hp,200);assert.equal(g.spells.length,0);assert.equal(p.armed,false);
});
test('save restores pending manual flame and remaining burrow time; older snapshots still load',()=>{
 const g=new Game(5);g.place('nezha',2,0);g.energy=100;g.place('pangolin',1,2);g.castFire(g.plants[0].id,2,5);g.step(.1);
 const snap=snapshotGame(g),h=restoreGame(snap);assert.deepEqual(snapshotGame(h),snap);assert.equal(h.spells[0].hit,false);assert.ok(h.plants.find(p=>p.type==='pangolin').armLeft>13);advance(g,.4);advance(h,.4);assert.deepEqual(snapshotGame(h),snapshotGame(g));
 const old=snapshotGame(new Game(1));delete old.spells;assert.deepEqual(restoreGame(old).spells,[]);
 assert.equal(decodeSave(encodeSave({...emptySave(),completed:5})).completed,5);assert.equal(decodeSave(JSON.stringify({version:1,completed:2})).completed,2);
});
test('unlocks follow 1-3 Nezha, 1-4 pangolin, 1-5 eldest; five and seven remain later',()=>{
 for(const [id,before,after] of [['nezha',2,3],['pangolin',3,4],['tall',4,5]]){assert.equal(isCharacterUnlocked(id,before),false);assert.equal(isCharacterUnlocked(id,after),true);}
 assert.equal(isCharacterUnlocked('water',5),false);assert.equal(isCharacterUnlocked('seven',5),false);assert.ok(LEVELS[4].cards.includes('nezha'));assert.ok(LEVELS[5].cards.includes('pangolin'));
});
test('new levels are winnable with ordinary collection and placement across three random seeds',()=>{
 for(const level of [3,4,5])for(const seed of [7,71,711]){
  const g=new Game(level);g.randomState=seed;
  for(let tick=0;tick<10000&&g.status==='playing';tick++){
   for(const o of [...g.orbs])g.collect(o.id);
   if(g.plants.filter(p=>p.type==='vine').length<5)for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===0)){g.place('vine',row,0);break;}
   for(let col=1;col<5;col++)for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===col))g.place('fire',row,col);
   g.step(.05);
  }
  assert.equal(g.status,'won',`level ${level}, seed ${seed}`);assert.equal(g.kills,g.cfg.schedule.length);
 }
});
