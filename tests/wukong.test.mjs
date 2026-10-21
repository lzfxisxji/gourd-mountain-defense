import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,GRID} from '../src/engine.js';
import {emptySave,encodeSave,decodeSave,snapshotGame,restoreGame} from '../src/storage.js';
import {buyWukong,WUKONG_PRICE} from '../src/economy.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)g.step(.01);};
const setup=()=>{const g=new Game(10);g.equip(['wukong']);g.energy=300;g.place('wukong',2,0);g.enemies.push({id:++g.nextId,type:'snake',row:2,x:1000,hp:1000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0,freezeClock:40,castLeft:0});return g;};
test('Wukong throws first at five seconds and waits another five between throws',()=>{
 const g=setup();advance(g,4.99);assert.equal(g.bullets.length,0);advance(g,.01);assert.equal(g.bullets[0].kind,'staff');assert.equal(g.energy,0);advance(g,4.99);assert.equal(g.events.filter(e=>e.type==='throw').length,1);advance(g,.01);assert.equal(g.events.filter(e=>e.type==='throw').length,2);
});
test('staff persists five seconds and pulses exactly five times for 50 each',()=>{
 const g=setup(),e=g.enemies[0];e.x=900;g.plants[0].timer=100;g.staves.push({id:++g.nextId,row:2,x:900,life:5,tickClock:0,ticks:0});advance(g,.99);assert.equal(e.hp,1000);advance(g,.01);assert.equal(e.hp,950);advance(g,4);assert.equal(e.hp,750);assert.equal(g.staves.length,0);assert.equal(g.events.filter(e=>e.type==='staffHit').length,5);
});
test('staff survives original target death and damages another enemy only in its lane',()=>{
 const g=setup();g.plants[0].timer=100;const first=g.enemies[0];first.x=900;first.hp=50;g.staves.push({id:++g.nextId,row:2,x:900,life:5,tickClock:0,ticks:0});advance(g,1);assert.equal(first.hp,0);assert.equal(g.staves.length,1);const next={...first,id:++g.nextId,hp:1000,x:900};g.enemies.push(next,{...next,id:++g.nextId,row:1});advance(g,1);assert.equal(next.hp,950);assert.equal(g.enemies.find(e=>e.row===1).hp,1000);
});
test('purchase and mid-flight / lingering staff roundtrip; older saves remain valid',()=>{
 const s=emptySave();assert.equal(buyWukong(s),false);s.coins=WUKONG_PRICE;assert.ok(buyWukong(s));assert.equal(s.coins,0);assert.equal(buyWukong(s),false);
 const g=setup();advance(g,5.1);s.battle=snapshotGame(g);const h=restoreGame(decodeSave(encodeSave(s)).battle);advance(g,2);advance(h,2);assert.deepEqual(snapshotGame(g),snapshotGame(h));assert.ok(g.staves.length>0);const k=restoreGame(snapshotGame(g));advance(g,1);advance(k,1);assert.deepEqual(snapshotGame(g),snapshotGame(k));
 const legacy=snapshotGame(new Game(1));delete legacy.staves;assert.deepEqual(restoreGame(legacy).staves,[]);const old=emptySave();delete old.unlocks.wukong;assert.equal(decodeSave(JSON.stringify(old)).unlocks.wukong,false);
});
