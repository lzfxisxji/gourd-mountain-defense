import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {advanceBattle} from '../src/timing.js';
import {emptySave,decodeSave,encodeSave} from '../src/storage.js';
test('1x/1.5x/2x advance simulation, cooldowns and freeze duration together',()=>{
 for(const speed of [1,1.5,2]){const g=new Game(10);g.battleMode='normal';g.place('fire',2,0);g.plants[0].freezeLeft=8;for(let i=0;i<20;i++)advanceBattle(g,.05,speed);assert.ok(Math.abs(g.time-speed)<1e-8);assert.ok(Math.abs(g.cooldowns.fire-(7.5-speed))<1e-8);assert.ok(Math.abs(g.plants[0].freezeLeft-(8-speed))<1e-8);}
});
test('2x uses bounded substeps and never advances finished games',()=>{
 const steps=[],g={status:'playing',step(dt){steps.push(dt);}};advanceBattle(g,.05,2);assert.deepEqual(steps,[.05,.05]);g.status='won';advanceBattle(g,1,2);assert.equal(steps.length,2);
});
test('speed persists through export, legacy defaults to 1x and invalid values reject',()=>{
 const s=emptySave();s.settings.speed=1.5;assert.equal(decodeSave(encodeSave(s)).settings.speed,1.5);delete s.settings.speed;assert.equal(decodeSave(JSON.stringify(s)).settings.speed,1);s.settings.speed=3;assert.throws(()=>encodeSave(s));
});
