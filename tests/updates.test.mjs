import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {UpdateController}=createRequire(import.meta.url)('../desktop/update-controller.cjs');
class Updater extends EventEmitter{
 async checkForUpdates(){this.emit('checking-for-update');this.emit('update-available',{version:'0.2.1',releaseNotes:'<p>新增角色</p>'});}
 async downloadUpdate(){this.emit('download-progress',{percent:42});this.emit('update-downloaded',{version:'0.2.1'});}
 quitAndInstall(...args){this.installed=args;}
}
test('updates require explicit download and save before install; quitting never auto-installs',async()=>{
 const u=new Updater(),events=[],order=[];const c=new UpdateController(u,{version:'0.2.0',notify:s=>events.push(s),prepareInstall:async()=>order.push('save'),flush:()=>order.push('flush')});
 assert.equal(u.autoDownload,false);assert.equal(u.autoInstallOnAppQuit,false);assert.equal(u.allowDowngrade,false);
 await c.check();assert.equal(c.state.status,'available');assert.equal(c.state.notes,'新增角色');assert.equal(u.installed,undefined);
 await c.download();assert.equal(c.state.status,'downloaded');assert.ok(events.some(s=>s.percent===42));await c.install();assert.deepEqual(order,['save','flush']);assert.deepEqual(u.installed,[false,true]);
});
test('unsupported portable builds, duplicate requests and install without download are inert',async()=>{
 const u=new Updater(),c=new UpdateController(u,{version:'0.2.0',supported:false});await c.check();await c.download();await c.install();assert.equal(c.state.status,'unsupported');assert.equal(u.installed,undefined);
 const d=new UpdateController(new Updater(),{version:'0.2.0'});await d.install();assert.equal(d.state.status,'idle');
});
test('network failure can be retried and failed save prevents install',async()=>{
 const u=new Updater(),c=new UpdateController(u,{version:'0.2.0',prepareInstall:async()=>{throw Error('disk');}});
 u.checkForUpdates=async()=>{throw Error('network');};await c.check();assert.equal(c.state.status,'error');u.checkForUpdates=Updater.prototype.checkForUpdates;await c.check();await c.download();await c.install();assert.equal(c.state.status,'downloaded');assert.equal(u.installed,undefined);
});
test('up-to-date and download error update state without installing or exposing HTML',async()=>{
 const u=new Updater(),c=new UpdateController(u,{version:'0.2.0'});u.emit('update-not-available');assert.equal(c.state.status,'latest');await c.check();u.downloadUpdate=async()=>{throw Error('checksum mismatch');};await c.download();assert.equal(c.state.status,'error');assert.equal(u.installed,undefined);
});
