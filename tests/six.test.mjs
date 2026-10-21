import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID,MONSTERS} from '../src/engine.js';
import {isCharacterUnlocked} from '../src/roster.js';
import {snapshotGame,restoreGame,encodeSave,emptySave} from '../src/storage.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const setup=()=>{const g=new Game(10);g.equip(['six']);g.energy=1000;g.place('six',2,4);return g;};
const enemy=(g,type='frog',row=2,x=GRID.x+4.5*GRID.cw+30)=>{const e={id:++g.nextId,type,row,x,hp:MONSTERS[type].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0};g.enemies.push(e);return e;};
test('six unlocks after chapter completion and immediately ambushes ground enemies once',()=>{
 assert.equal(isCharacterUnlocked('six',9),false);assert.equal(isCharacterUnlocked('six',10),true);
 const g=setup(),a=enemy(g),b=enemy(g,'frog',2,a.x+50),other=enemy(g,'frog',1,a.x);g.step(.01);assert.equal(g.plants[0].spent,true);assert.equal(a.hp,200);assert.equal(g.spells[0].kind,'ambush');advance(g,.46);assert.equal(a.hp,0);assert.equal(b.hp,0);assert.equal(other.hp,200);advance(g,1);assert.equal(g.plants.length,0);assert.equal(g.events.filter(e=>e.type==='ambush').length,1);
});
test('flying, off-lawn and distant enemies cannot trigger six',()=>{
 for(const [type,x]of [['bat',920],['frog',1600],['frog',1150]]){const g=setup(),e=enemy(g,type,2,x);g.step(.01);assert.equal(g.spells.length,0);assert.equal(g.plants[0].hp,300);assert.ok(e.hp>0);}
});
test('hidden six is ignored by melee and cannot act while frozen',()=>{
 const g=setup();g.plants[0].freezeLeft=2;const e=enemy(g);advance(g,1);assert.equal(g.plants[0].hp,300);assert.equal(e.eating,false);assert.equal(g.spells.length,0);advance(g,1.2);assert.equal(g.spells.length,1);
});
test('snake takes 500 ambush damage; in-flight leap survives save and resolves once',()=>{
 const g=setup(),e=enemy(g,'snake');g.step(.01);advance(g,.2);const h=restoreGame(snapshotGame(g));assert.ok(encodeSave({...emptySave(),completed:10,battle:snapshotGame(g)}));advance(g,.3);advance(h,.3);assert.equal(e.hp,500);assert.deepEqual(snapshotGame(g),snapshotGame(h));advance(g,.5);assert.equal(e.hp,500);
});
