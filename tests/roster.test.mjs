import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS,CHARACTERS} from '../src/engine.js';
import {FUTURE_CHARACTERS,ALMANAC_CHARACTERS,isCharacterUnlocked,CONFIRMED_ROLE_MAPPING} from '../src/roster.js';
import {POSES} from '../src/animation.js';

test('seventh and second brothers unlock after the corresponding chapter levels',()=>{
 assert.equal(CHARACTERS.seven.refineTime,42);assert.equal(CHARACTERS.erwa.cost,200);assert.equal(CHARACTERS.erwa.burstCount,2);
 for(const level of [1,2,7])assert.ok(!LEVELS[level].cards.includes('seven'));
 assert.equal(isCharacterUnlocked('seven',6),false);assert.equal(isCharacterUnlocked('seven',7),true);assert.ok(LEVELS[8].cards.includes('seven'));
 assert.equal(isCharacterUnlocked('erwa',7),false);assert.equal(isCharacterUnlocked('erwa',8),true);assert.ok(LEVELS[9].cards.includes('erwa'));
 for(const key of ['sevenIdle','sevenAbsorb','sevenRefine','erwaIdle','erwaPrepare','erwaRelease'])assert.ok(POSES[key]);
});
test('current unlocks and fifth brother mapping stay explicit',()=>{
 assert.equal(isCharacterUnlocked('fire',0),true);assert.equal(isCharacterUnlocked('vine',0),false);assert.equal(isCharacterUnlocked('vine',1),true);assert.equal(isCharacterUnlocked('wall',1),false);assert.equal(isCharacterUnlocked('wall',2),true);assert.equal(isCharacterUnlocked('unknown',10),false);
 assert.equal(CONFIRMED_ROLE_MAPPING.water.equivalent,'寒冰射手');assert.equal(CONFIRMED_ROLE_MAPPING.water.projectile,'水弹');assert.equal(CONFIRMED_ROLE_MAPPING.water.effect,'减速');
});
