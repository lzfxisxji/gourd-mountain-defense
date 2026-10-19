import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS} from '../src/engine.js';
import {snapshotGame,restoreGame,emptySave,decodeSave,encodeSave} from '../src/storage.js';
test('equipped cards enforce slot capacity, uniqueness and actual placement',()=>{
 const g=new Game(7);assert.throws(()=>g.equip(LEVELS[7].cards,6));assert.throws(()=>g.equip(['fire','fire']));assert.throws(()=>g.equip([]));assert.throws(()=>g.equip(['unknown']));
 g.equip(['water','vine','tall']);g.energy=1000;assert.equal(g.place('fire',2,0),false);assert.ok(g.place('water',2,0));assert.ok(g.place('tall',2,1));assert.equal(g.plants[1].hp,8000);
});
test('chosen order, capacity, deployed water and slow state survive export and restore',()=>{
 const g=new Game(7);g.equip(['water','vine','tall','fire','nezha','pangolin'],6);g.energy=1000;g.place('water',2,0);g.place('tall',2,4);
 const s={...emptySave(),completed:6,battle:snapshotGame(g)},h=restoreGame(decodeSave(encodeSave(s)).battle);assert.deepEqual(h.cards,g.cards);assert.equal(h.slotCapacity,6);assert.equal(h.place('wall',2,1),false);
 const old=snapshotGame(new Game(3));delete old.loadout;delete old.slotCapacity;assert.deepEqual(restoreGame(old).cards,LEVELS[3].cards);
 s.completed=5;assert.throws(()=>encodeSave(s));
});
test('levels six and seven win with legal resource income and an equipped roster',()=>{
 for(const level of [6,7])for(const seed of [7,71,711]){
  const g=new Game(level);g.randomState=seed;g.equip(level===6?['vine','fire','tall','wall','nezha','pangolin']:['vine','fire','water','tall','nezha','pangolin']);
  for(let tick=0;tick<11000&&g.status==='playing';tick++){
   for(const o of [...g.orbs])g.collect(o.id);
   for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===0))g.place('vine',row,0);
   for(let col=1;col<5;col++)for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===col))g.place(level===7&&col===2?'water':'fire',row,col);
   for(const row of g.cfg.rows)if(g.energy>=250&&!g.plants.some(p=>p.row===row&&p.col===5))g.place('tall',row,5);
   g.step(.05);
  }
  assert.equal(g.status,'won',`level ${level}, seed ${seed}`);assert.equal(g.kills,g.cfg.schedule.length);
 }
});
