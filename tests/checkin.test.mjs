import test from 'node:test';
import assert from 'node:assert/strict';
import {chinaDay,claimDaily,canClaimDaily,DAILY_REWARDS} from '../src/checkin.js';
import {emptySave,encodeSave,decodeSave,snapshotGame,restoreGame} from '../src/storage.js';
import {Game} from '../src/engine.js';
import {isCharacterUnlocked} from '../src/roster.js';
const day=n=>new Date(`2026-10-${String(n).padStart(2,'0')}T12:00:00+08:00`);
test('daily claim grants 3000 once, resets at China midnight and grants Beta on the second day',()=>{
 const s=emptySave();assert.equal(chinaDay(new Date('2026-10-23T15:59:59Z')),'2026-10-23');assert.equal(chinaDay(new Date('2026-10-23T16:00:00Z')),'2026-10-24');
 assert.equal(claimDaily(s,day(23)).coins,3000);assert.equal(s.coins,3000);assert.equal(claimDaily(s,day(23)),false);assert.equal(canClaimDaily(s,day(22)),false);
 const restored=decodeSave(encodeSave(s));assert.equal(canClaimDaily(restored,day(23)),false);assert.equal(claimDaily(restored,day(24)).character,'beta');assert.equal(isCharacterUnlocked('beta',0,restored.unlocks),true);assert.equal(restored.coins,3000);
});
test('missed days do not reset progress; seven rewards finish without repeating or overwriting purchased partners',()=>{
 const s=emptySave();s.unlocks.blackcat=true;claimDaily(s,day(1));claimDaily(s,day(5));for(let n=6;n<=10;n++)assert.ok(claimDaily(s,day(n)));
 assert.equal(s.checkin.claimed,7);assert.equal(s.coins,DAILY_REWARDS.reduce((sum,r)=>sum+(r.coins??0),0));assert.equal(s.unlocks.blackcat,true);assert.equal(s.unlocks.beta,true);assert.equal(claimDaily(s,day(11)),false);assert.deepEqual(decodeSave(encodeSave(s)).checkin,s.checkin);
});
test('legacy saves migrate; invalid sign-in dates and locked Beta lineups reject',()=>{
 const old=emptySave();delete old.checkin;delete old.unlocks.beta;assert.deepEqual(decodeSave(JSON.stringify(old)).checkin,{claimed:0,lastDate:null});
 for(const state of [{claimed:8,lastDate:'2026-10-23'},{claimed:1,lastDate:'2026-02-30'},{claimed:0,lastDate:'2026-10-23'},{claimed:2,lastDate:'2026-10-23'}])assert.throws(()=>decodeSave(JSON.stringify({...emptySave(),checkin:state})));
 const g=new Game(11);g.equip(['vine','beta']);const s=emptySave();s.completed=10;s.battle=snapshotGame(g);assert.throws(()=>encodeSave(s));claimDaily(s,day(23));claimDaily(s,day(24));assert.equal(decodeSave(encodeSave(s)).unlocks.beta,true);assert.deepEqual(restoreGame(s.battle).cards,['vine','beta']);
});
