import test from 'node:test';import assert from 'node:assert/strict';
import {ChallengeGame,BOX_POOL,VASE_ROLE_COUNTS,VASE_ENEMY_COUNTS} from '../src/challenges.js';
import {Game,GRID,CHARACTERS} from '../src/engine.js';
import {emptySave,snapshotGame,restoreGame,encodeSave,decodeSave} from '../src/storage.js';
import {advanceBattle} from '../src/timing.js';
const step=(g,t)=>{for(let i=0;i<Math.round(t*20);i++)g.step(.05);};
test('random-box conveyor starts empty, supplies every five seconds and opens every non-producer with equal probability',()=>{
 const g=new ChallengeGame('boxes');assert.equal(g.cards.length,0);step(g,4.95);assert.equal(g.cards.length,0);step(g,.05);assert.deepEqual(g.cards,['box']);assert.equal(g.openBox(-1),false);assert.equal(g.place('box',2,0),false);assert.equal(g.cards.length,1);
 const counts={};for(let i=0;i<BOX_POOL.length*10;i++){const h=new ChallengeGame('boxes');h.belt=['box'];h.beltPositions=[8];h.random=()=>((i%BOX_POOL.length)+.5)/BOX_POOL.length;const type=h.openBox(0);counts[type]=(counts[type]??0)+1;assert.notEqual(type,'vine');assert.equal(h.openBox(0),false);assert.ok(h.place(type,2,0));assert.equal(h.energy,0);assert.equal(h.cards.length,0);assert.equal(h.cooldowns[type],undefined);}
 assert.equal(Object.keys(counts).length,Object.keys(CHARACTERS).length-1);assert.ok(Object.values(counts).every(n=>n===10));step(g,45);assert.equal(g.cards.length,8);
});
test('vases form only the right 5x5 of an eight-column field, carry the exact roster and contain one scorpion',()=>{
 for(let seed=1;seed<=25;seed++){const g=new ChallengeGame('vases');g.randomState=seed;assert.equal(g.cols,8);assert.equal(g.vases.length,25);assert.equal(new Set(g.vases.map(v=>`${v.row}:${v.col}`)).size,25);assert.ok(g.vases.every(v=>v.row>=0&&v.row<5&&v.col>=3&&v.col<8));
 for(const [type,count]of Object.entries(VASE_ROLE_COUNTS))assert.equal(g.vases.filter(v=>v.kind==='role'&&v.type===type).length,count);
 for(const [type,count]of Object.entries(VASE_ENEMY_COUNTS))assert.equal(g.vases.filter(v=>v.kind==='enemy'&&v.type===type).length,count);}
 assert.equal(new Game(1).cols,9);
});
test('breaking vases is once-only, releases an immediate monster or free card, and occupied vases block placement',()=>{
 const g=new ChallengeGame('vases'),role=g.vases.find(v=>v.kind==='role'),monster=g.vases.find(v=>v.kind==='enemy');assert.equal(g.status,'playing');step(g,1);assert.equal(g.status,'playing');assert.equal(g.enemies.length,0);assert.equal(g.orbs.length,0);assert.equal(g.breakVase(role.row,role.col).type,role.type);assert.equal(g.breakVase(role.row,role.col),false);
 assert.equal(g.place(role.type,monster.row,monster.col),false);assert.equal(g.cards.length,1);assert.equal(g.place(role.type,2,8),false);assert.ok(g.place(role.type,2,0));assert.equal(g.cards.length,0);assert.equal(g.energy,0);assert.deepEqual(g.cooldowns,{});g.breakVase(monster.row,monster.col);assert.equal(g.enemies[0].type,monster.type);assert.equal(g.enemies[0].x,GRID.x+(monster.col+.5)*GRID.cw);assert.equal(g.spawned,1);
});
test('both challenges restore sealed boxes, random state, vase contents and pickups without touching a saved adventure',()=>{
 for(const mode of ['boxes','vases']){const g=new ChallengeGame(mode);if(mode==='boxes')step(g,7);else{const r=g.vases.find(v=>v.kind==='role');g.breakVase(r.row,r.col);const e=g.vases.find(v=>v.kind==='enemy');g.breakVase(e.row,e.col);}
 const h=restoreGame(snapshotGame(g));assert.equal(h.challenge,mode);assert.deepEqual(snapshotGame(h),snapshotGame(g));step(g,1);step(h,1);assert.deepEqual(snapshotGame(h),snapshotGame(g));const s=emptySave();s.battle=snapshotGame(new Game(1));s.challengeBattle=snapshotGame(g);const restored=decodeSave(encodeSave(s));assert.equal(restored.completed,0);assert.equal(restored.battle.level,1);assert.equal(restored.challengeBattle.challenge,mode);assert.equal(restored.unlocks.wukong,false);}
 const old=emptySave();delete old.challengeBattle;assert.equal(decodeSave(JSON.stringify(old)).challengeBattle,null);
});
test('invalid extra scorpions, overlapping vases, illegal box rewards and challenge/adventure slot confusion reject',()=>{
 const base=snapshotGame(new ChallengeGame('vases')),extra=structuredClone(base);const frog=extra.vases.find(v=>v.kind==='enemy'&&v.type==='frog');frog.type='scorpion';assert.throws(()=>restoreGame(extra));const overlap=structuredClone(base);overlap.vases[1].row=overlap.vases[0].row;overlap.vases[1].col=overlap.vases[0].col;assert.throws(()=>restoreGame(overlap));
 const box=snapshotGame(new ChallengeGame('boxes'));box.belt=['vine'];box.beltPositions=[0];assert.throws(()=>restoreGame(box));const s=emptySave();s.battle=base;assert.throws(()=>encodeSave(s));s.battle=null;s.challengeBattle=snapshotGame(new Game(1));assert.throws(()=>encodeSave(s));
});
test('battle speed advances supply and motion together; pending vases prevent premature victory',()=>{
 const g=new ChallengeGame('boxes');for(let i=0;i<51;i++)advanceBattle(g,.05,2);assert.equal(g.cards.length,1);assert.ok(g.beltPositions[0]<8);const h=new ChallengeGame('vases');step(h,30);assert.equal(h.status,'playing');assert.equal(h.vases.length,25);
});
test('equal-chance box challenges win across three seeds with only generated cards and legal placements',()=>{
 const offense=['fire','water','erwa','blackcat','beta','wukong','shuke'];
 for(const seed of [7,71,711]){const g=new ChallengeGame('boxes');g.randomState=seed;
  for(let tick=0;tick<16000&&g.status==='playing';tick++){
   for(let i=0;i<g.belt.length;i++)if(g.belt[i]==='box')g.openBox(i);
   for(const type of [...g.cards]){
    const rows=[0,1,2,3,4].sort((a,b)=>g.plants.filter(p=>p.row===a&&offense.includes(p.type)).length-g.plants.filter(p=>p.row===b&&offense.includes(p.type)).length);
    if(type==='nezha'){const target=g.enemies.filter(e=>e.x<1450&&e.x>337).sort((a,b)=>b.hp-a.hp)[0];if(!target)continue;const col=Math.max(0,Math.min(8,Math.floor((target.x-337)/124)));for(const c of [col,col-1,col+1])if(g.place(type,target.row,c)){g.castFire(g.plants.at(-1).id,target.row,col);break;}continue;}
    let placed=false;const cols=offense.includes(type)?[0,1,2,3]:type==='pangolin'?[7,6,8]:[5,6,7];for(const row of rows){for(const col of cols)if(g.place(type,row,col)){placed=true;break;}if(placed)break;}
   }g.step(.05);
  }assert.equal(g.status,'won',`seed ${seed}`);assert.equal(g.kills,25);assert.equal(g.energy,0);
 }
});
test('vase layouts can be won using only their finite cards and ordinary damage',()=>{
 // A layout-aware planner verifies a solution exists, using legal clicks and card placements.
 for(const roll of [.11,.37,.73]){const g=new ChallengeGame('vases',()=>roll);const scorpion=g.vases.find(v=>v.type==='scorpion'),enemies=g.vases.filter(v=>v.kind==='enemy');
 for(const v of [...g.vases].filter(v=>v.kind==='role'))g.breakVase(v.row,v.col);
 const rows=[...new Set(enemies.map(v=>v.row))];for(const row of rows){const type=g.cards.includes('erwa')?'erwa':g.cards.includes('fire')?'fire':'water';assert.ok(g.place(type,row,0));}
 for(const type of [...g.cards]){if(['fire','water','erwa'].includes(type)){for(const col of [1,2,3]){const row=rows.find(r=>!g.plants.some(p=>p.row===r&&p.col===col));if(row!==undefined&&g.place(type,row,col))break;}}}
 // The scorpion's unopened tile is reserved for the mine ambush before releasing him.
 const mineCol=scorpion.col-1;if(!g.isCellBlocked(scorpion.row,mineCol)&&!g.plants.some(p=>p.row===scorpion.row&&p.col===mineCol))g.place('pangolin',scorpion.row,mineCol);
 step(g,15);for(const v of enemies)g.breakVase(v.row,v.col);
 for(let tick=0;tick<12000&&g.status==='playing';tick++){
  const boss=g.enemies.find(e=>e.type==='scorpion');if(boss&&g.cards.includes('nezha')){const col=Math.max(0,Math.min(7,Math.floor((boss.x-GRID.x)/GRID.cw)));for(const c of [col,col-1,col+1])if(g.place('nezha',boss.row,c)){g.castFire(g.plants.at(-1).id,boss.row,col);break;}}
  for(const e of g.enemies)if(g.cards.includes('wall')){const col=Math.max(0,Math.min(7,Math.floor((e.x-GRID.x)/GRID.cw)-1));g.place('wall',e.row,col);}
  g.step(.05);
 }assert.equal(g.status,'won',`layout ${roll}`);assert.equal(g.kills,10);assert.equal(g.energy,0);
 }
});
