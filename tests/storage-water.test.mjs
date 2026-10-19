import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CHARACTERS,LEVELS} from '../src/engine.js';
import {emptySave,snapshotGame,restoreGame,encodeSave,decodeSave} from '../src/storage.js';
const advance=(g,n)=>{for(let i=0;i<Math.round(n*20);i++)g.step(.05);};
test('battle roundtrip preserves all entities, timers, random sequence and new actor IDs',()=>{
 const g=new Game(2);g.place('vine',2,0);advance(g,24);g.enemies[0].slowLeft=7;g.enemies[0].slowFactor=.5;
 const snap=snapshotGame(g),h=restoreGame(snap);assert.deepEqual(snapshotGame(h),snap);
 assert.equal(h.random(),g.random());advance(g,2);advance(h,2);assert.deepEqual(snapshotGame(h),snapshotGame(g));
 const ids=[...h.plants,...h.enemies,...h.orbs].map(x=>x.id);h.energy=1000;h.place('fire',1,1);assert.ok(h.plants.at(-1).id>Math.max(...ids));
 h.plants[0].hp=1;assert.notEqual(g.plants[0].hp,1);
});
test('old progress migrates; exported save roundtrips; invalid data is rejected',()=>{
 const old=decodeSave(JSON.stringify({version:1,completed:2}));assert.equal(old.version,2);assert.equal(old.completed,2);assert.equal(old.battle,null);
 const current={...emptySave(),completed:1,battle:snapshotGame(new Game(1))};assert.deepEqual(decodeSave(encodeSave(current)),current);
 for(const bad of ['{oops',JSON.stringify({version:99,completed:0}),JSON.stringify({...current,battle:{...current.battle,energy:-1}}),JSON.stringify({...current,battle:{...current.battle,randomState:0}})])assert.throws(()=>decodeSave(bad));
 const bad=structuredClone(current);bad.battle.plants=[{id:1,type:'seven',row:2,col:0,hp:300}];assert.throws(()=>decodeSave(JSON.stringify(bad)));
});
test('water bullet causes damage, halves speed, refreshes duration without stacking and expires',()=>{
 const g=new Game(1);advance(g,18);const e=g.enemies[0];e.x=900;
 const hit=()=>{g.bullets.push({x:e.x-40,row:2,damage:20,kind:'water'});g.step(.05);};
 hit();assert.equal(e.hp,180);assert.equal(e.slowLeft,10);const x=e.x;advance(g,2);assert.ok(Math.abs(x-e.x-17)<.001);
 hit();assert.equal(e.hp,160);assert.equal(e.slowFactor,.5);assert.equal(e.slowLeft,10);advance(g,10.1);assert.equal(e.slowLeft,0);const after=e.x;advance(g,1);assert.ok(Math.abs(after-e.x-17)<.001);
});
test('water shooter uses water projectiles and slow attack cadence; existing two levels keep cards',()=>{
 const g=new Game(2);g.cfg={...g.cfg,cards:['water']};g.energy=175;assert.equal(g.place('water',2,0),true);advance(g,22);g.enemies[0].x=900;advance(g,.65);assert.equal(g.bullets[0].kind,'water');
 const h=new Game(1);h.place('fire',2,0);advance(h,18);h.enemies[0].x=450;h.enemies[0].slowLeft=10;h.enemies[0].slowFactor=.5;advance(h,.6);assert.equal(h.plants[0].hp,300);advance(h,.3);assert.equal(h.plants[0].hp,200);
 assert.equal(CHARACTERS.water.cost,175);for(const level of [1,2,3,4,5,6])assert.ok(!LEVELS[level].cards.includes('water'));assert.ok(LEVELS[7].cards.includes('water'));
});
test('snapshot restores an in-flight water ball and its remaining slow effect',()=>{
 const g=new Game(1);advance(g,18);g.enemies[0].x=900;g.enemies[0].slowLeft=4.2;g.enemies[0].slowFactor=.5;g.bullets.push({x:400,row:2,damage:20,kind:'water'});
 const h=restoreGame(snapshotGame(g));assert.equal(h.enemies[0].slowLeft,4.2);assert.equal(h.bullets[0].kind,'water');advance(g,1);advance(h,1);assert.deepEqual(snapshotGame(g),snapshotGame(h));
});
