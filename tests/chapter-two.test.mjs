import test from 'node:test';import assert from 'node:assert/strict';
import {Game,LEVELS,MONSTERS} from '../src/engine.js';import {LAST_LEVEL,adventureLevel} from '../src/levels.js';
import {snapshotGame,restoreGame,emptySave,encodeSave,decodeSave} from '../src/storage.js';
test('five cave levels follow 1-10, use a shared map and support progression and saved battles',()=>{
 assert.equal(LAST_LEVEL,15);assert.equal(adventureLevel({completed:10}),11);
 for(let i=11;i<=15;i++){const cfg=LEVELS[i];assert.equal(cfg.name,`2-${i-10}`);assert.equal(cfg.map,'cave');assert.deepEqual(cfg.rows,[0,1,2,3,4]);assert.equal(!!cfg.conveyor,false);assert.ok(cfg.cards.includes('six'));assert.ok(cfg.schedule.every((s,n)=>MONSTERS[s.type??'frog']&&s.t>0&&(!n||s.t>=cfg.schedule[n-1].t)));
 const g=new Game(i);g.equip(['vine','fire','water','tall','nezha','pangolin']);const s=emptySave();s.completed=i-1;s.battle=snapshotGame(g);assert.equal(decodeSave(encodeSave(s)).battle.level,i);assert.equal(restoreGame(s.battle).cfg.map,'cave');}
 assert.ok(LEVELS[15].schedule.some(s=>s.type==='snake'));
});
test('every cave level is winnable with six ordinary unlocked cards and legal income, without sign-in rewards',()=>{
 for(let level=11;level<=15;level++)for(const seed of [7,71,711]){
 const g=new Game(level);g.randomState=seed;g.equip(['vine','fire','water','tall','nezha','pangolin']);
 for(let tick=0;tick<14000&&g.status==='playing';tick++){
  for(const o of [...g.orbs])g.collect(o.id);
  for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===0))g.place('vine',row,0);
  for(let col=1;col<5;col++)for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===col))g.place(col===2?'water':'fire',row,col);
  for(const row of g.cfg.rows)if(g.energy>=250&&!g.plants.some(p=>p.row===row&&p.col===5))g.place('tall',row,5);
  g.step(.05);
 }assert.equal(g.status,'won',`level ${level} seed ${seed}`);assert.equal(g.kills,g.cfg.schedule.length);
 }
});
