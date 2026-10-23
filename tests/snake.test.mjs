import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS,LEVELS} from '../src/engine.js';
import {LAST_LEVEL,adventureLevel} from '../src/levels.js';
import {snapshotGame,restoreGame} from '../src/storage.js';
const advance=(g,t)=>{for(let n=0;n<t*20;n++)g.step(.05);};
const snake=(g,x=900)=>{const e={id:++g.nextId,type:'snake',row:2,x,hp:1000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
test('snake has 1000 hp and takes exactly two 500-damage explosions from full health',()=>{
 assert.equal(MONSTERS.snake.hp,1000);
 for(const combo of [['fire','fire'],['mine','mine'],['fire','mine']]){const g=new Game(7),e=snake(g);g.damageEnemy(e,1800,combo[0]);assert.equal(e.hp,500);g.damageEnemy(e,1800,combo[1]);assert.equal(e.hp,0);g.step(.05);assert.equal(g.corpses[0].type,'snake');assert.equal(g.debris.length,0);}
});
test('snake does not cap ordinary bullets, remains vulnerable to water slow, and retains half hp on save',()=>{
 const g=new Game(7),e=snake(g);for(let i=0;i<25;i++)g.damageEnemy(e,20);assert.equal(e.hp,500);assert.equal(g.debris.length,0);
 const h=restoreGame(snapshotGame(g));assert.equal(h.enemies[0].hp,500);assert.equal(h.enemies[0].type,'snake');
 g.bullets.push({row:2,x:860,damage:20,kind:'water'});g.step(.05);assert.equal(e.hp,480);assert.equal(e.slowLeft,10);
});
test('real mine and aimed flame each consume only half of snake full hp',()=>{
 const g=new Game(7);g.energy=1000;g.place('pangolin',2,4);const p=g.plants[0];p.armLeft=0;p.armed=true;const e=snake(g,GRID.x+4.5*GRID.cw+30);g.step(.05);assert.equal(e.hp,500);assert.ok(p.spent);
 g.place('nezha',2,0);assert.ok(g.castFire(g.plants[1].id,2,4));advance(g,.4);assert.equal(e.hp,0);
});
test('chapter progression crosses into cave and snake remains in chapter finales',()=>{
 assert.equal(LAST_LEVEL,15);assert.equal(adventureLevel({completed:10}),11);assert.equal(adventureLevel({completed:15}),15);assert.equal(adventureLevel({completed:7}),8);assert.equal(adventureLevel({completed:9}),10);
 for(const level of Object.keys(LEVELS).map(Number))assert.equal(LEVELS[level].schedule.filter(e=>e.type==='snake').length,[10,15].includes(level)?1:0);
 const g=new Game(10);g.time=204.99;g.spawned=g.cfg.schedule.findIndex(s=>s.type==='snake');g.step(.05);assert.equal(g.enemies.find(e=>e.type==='snake').hp,1000);
});
test('last three levels are winnable using legal income, six equipped cards and ordinary shots',()=>{
 for(const level of [8,9,10])for(const seed of [7,71,711]){
  const g=new Game(level);g.randomState=seed;g.equip(['vine','fire','water','tall','nezha','pangolin']);
  for(let tick=0;tick<14000&&g.status==='playing';tick++){
   for(const o of [...g.orbs])g.collect(o.id);
   for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===0))g.place('vine',row,0);
   for(let col=1;col<5;col++)for(const row of g.cfg.rows)if(!g.plants.some(p=>p.row===row&&p.col===col))g.place(col===2?'water':'fire',row,col);
   for(const row of g.cfg.rows)if(g.energy>=250&&!g.plants.some(p=>p.row===row&&p.col===5))g.place('tall',row,5);
   g.step(.05);
  }
  assert.equal(g.status,'won',`level ${level}, seed ${seed}`);assert.equal(g.kills,g.cfg.schedule.length);
 }
});
