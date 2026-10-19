import test from 'node:test';
import assert from 'node:assert/strict';
import {SLOT_PRICES,buySlot,victoryCoins} from '../src/economy.js';
import {Game} from '../src/engine.js';
import {emptySave,decodeSave,encodeSave,snapshotGame,restoreGame} from '../src/storage.js';
test('slot upgrades enforce exact original prices, sequence, funds and maximum',()=>{
 const s=emptySave();assert.equal(s.slots,6);assert.equal(buySlot(s),false);
 s.coins=110750;for(const [slot,price] of Object.entries(SLOT_PRICES)){const before=s.coins;assert.ok(buySlot(s));assert.equal(s.slots,+slot);assert.equal(s.coins,before-price);}
 assert.equal(s.coins,5000);assert.equal(buySlot(s),false);assert.equal(decodeSave(encodeSave(s)).slots,10);
});
test('legacy saves default to zero coins and six slots; invalid wallet is rejected',()=>{
 const s=emptySave();delete s.coins;delete s.slots;assert.equal(decodeSave(JSON.stringify(s)).slots,6);
 for(const patch of [{coins:-1},{coins:1.5},{slots:11},{slots:5}])assert.throws(()=>decodeSave(JSON.stringify({...emptySave(),...patch})));
});
test('enemy drops can be collected only once and pending coins survive battle reload',()=>{
 const g=new Game(1,()=>.1);g.step(18);g.enemies[0].hp=0;g.step(.05);assert.equal(g.coins.length,1);assert.equal(g.coins[0].value,50);
 const h=restoreGame(snapshotGame(g)),id=h.coins[0].id;assert.equal(h.collectCoin(id),50);assert.equal(h.collectCoin(id),0);assert.equal(h.energy,g.energy);
 const old=snapshotGame(g);delete old.coins;assert.deepEqual(restoreGame(old).coins,[]);
});
test('victory rewards active unused mowers and remaining drops, while expired coins disappear',()=>{
 const g=new Game(2);g.coins=[{id:1,x:800,y:500,life:1,value:10}];assert.equal(victoryCoins(g),410);
 g.mowers[1].used=true;assert.equal(victoryCoins(g),360);g.step(1.1);assert.equal(g.coins.length,0);
});
