import test from 'node:test';import assert from 'node:assert/strict';
import {enemyPose,POSES,WORLD_SCALE} from '../src/animation.js';
import {Game} from '../src/engine.js';import {snapshotGame,restoreGame} from '../src/storage.js';
test('scorpion walk uses four alternating poses while stillness, attacks and net retain a stable stance',()=>{
 const poses=[1024,1020,1017,1014].map(x=>enemyPose({type:'scorpion',x,phase:0},0));assert.equal(new Set(poses).size,4);for(const pose of poses)assert.equal(POSES[pose].file,'scorpion-walk-cycle');
 assert.equal(enemyPose({type:'scorpion',x:1020,phase:0},0),enemyPose({type:'scorpion',x:1020,phase:0},100));
 assert.equal(enemyPose({type:'scorpion',netLeft:4,x:1020,phase:0},0),enemyPose({type:'scorpion',netLeft:2,x:1020,phase:0},2));
 assert.equal(enemyPose({type:'scorpion',eating:true,attackClock:.5},10),'scorpionWindup');assert.equal(enemyPose({type:'scorpion',eating:true,attackClock:1},10),'scorpionSlash');assert.equal(enemyPose({type:'scorpion',eating:true,attackClock:2},10),'scorpionWalk');
 assert.deepEqual([0,.4,.8,1.2].map(time=>enemyPose({type:'scorpion',phase:0},time)),['scorpionWalkA','scorpionWalkB','scorpionWalkC','scorpionWalkD']);assert.equal(WORLD_SCALE.scorpion,1.5);
});
test('scorpion speed remains eight, slow advances fewer stride frames and save resumes the identical walk pose',()=>{
 const g=new Game(9);g.enemies.push({id:++g.nextId,type:'scorpion',x:1024,row:2,hp:2000,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:0});g.step(.4);assert.ok(Math.abs(g.enemies[0].x-1020.8)<1e-7);
 const saved=snapshotGame(g),h=restoreGame(saved);assert.equal(enemyPose(g.enemies[0],g.time),enemyPose(h.enemies[0],h.time));g.enemies[0].slowLeft=5;g.enemies[0].slowFactor=.5;const x=g.enemies[0].x;g.step(.4);assert.ok(Math.abs(g.enemies[0].x-(x-1.6))<1e-7);
});
