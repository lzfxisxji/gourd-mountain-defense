import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,LEVELS,CHARACTERS} from '../src/engine.js';
import {FUTURE_CHARACTERS,ALMANAC_CHARACTERS,isCharacterUnlocked,CONFIRMED_ROLE_MAPPING} from '../src/roster.js';
import {POSES} from '../src/animation.js';

test('seventh brother is reserved after 1-7 and cannot enter current battle roster',()=>{
 assert.equal(FUTURE_CHARACTERS.seven.unlockAfter,'1-7');assert.equal(FUTURE_CHARACTERS.seven.availableFrom,'1-8');assert.equal(FUTURE_CHARACTERS.seven.refineTime,42);
 assert.ok(ALMANAC_CHARACTERS.seven);assert.equal(CHARACTERS.seven,undefined);
 for(const level of [1,2]){assert.ok(!LEVELS[level].cards.includes('seven'));assert.equal(new Game(level).place('seven',2,0),false);}
 for(const completed of [0,1,2,7,10])assert.equal(isCharacterUnlocked('seven',completed),false);
 for(const key of ['sevenIdle','sevenAbsorb','sevenRefine'])assert.ok(POSES[key]);
});
test('current unlocks and fifth brother mapping stay explicit',()=>{
 assert.equal(isCharacterUnlocked('fire',0),true);assert.equal(isCharacterUnlocked('vine',0),false);assert.equal(isCharacterUnlocked('vine',1),true);assert.equal(isCharacterUnlocked('wall',1),false);assert.equal(isCharacterUnlocked('wall',2),true);assert.equal(isCharacterUnlocked('unknown',10),false);
 assert.equal(CONFIRMED_ROLE_MAPPING.water.equivalent,'寒冰射手');assert.equal(CONFIRMED_ROLE_MAPPING.water.projectile,'水弹');assert.equal(CONFIRMED_ROLE_MAPPING.water.effect,'减速');
});
