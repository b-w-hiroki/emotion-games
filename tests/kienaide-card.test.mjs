import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(fs.readFileSync('assets/kienaide-card.js','utf8'),context);
function rig(){
 const changes=[],downloads=[],revoked=[],timers=[],shares=[];let makeCount=0,scene='wish';
 const png={type:'image/png',size:100};
 const platform={navigator:{canShare:()=>true,share:payload=>{shares.push(payload);return Promise.resolve()}},File:class {constructor(parts,name,options){Object.assign(this,{parts,name,...options})}},URL:{createObjectURL:()=> 'blob:card',revokeObjectURL:url=>revoked.push(url)},document:{body:{append(){}},createElement:()=>({click(){downloads.push({filename:this.download,url:this.href})},remove(){}})},setTimeout:fn=>timers.push(fn)};
 const input=()=>({canvas:{toBlob:done=>done(png)},filename:'kienaide-'+scene+'.png',title:'きえないで。',text:scene+' https://example.test/kienaide/'});
 const options={make:()=>{makeCount++;return input()},change:value=>changes.push({...value})};
 const controller=context.KienaideCard.create({...options,make:()=>options.make()},platform);
 return {controller,platform,options,input,changes,downloads,revoked,timers,shares,png,setScene:value=>{scene=value},get makeCount(){return makeCount}};
}
test('native file sharing starts synchronously in the tap, using the prebuilt PNG',async()=>{
 const r=rig();await r.controller.prepare();assert.equal(r.changes.at(-1).state,'ready');
 const save=r.controller.save();assert.equal(r.shares.length,1,'do not insert an await before navigator.share');await save;
 assert.equal(r.shares[0].files[0].name,'kienaide-wish.png');assert.equal(r.makeCount,1);assert.equal(r.downloads.length,0);
});
test('repeated taps cannot open multiple share sheets',async()=>{
 const r=rig();let resolve;r.platform.navigator.share=payload=>{r.shares.push(payload);return new Promise(done=>{resolve=done})};
 await r.controller.prepare();const pending=r.controller.save();await r.controller.save();assert.equal(r.shares.length,1);resolve();await pending;assert.equal(r.changes.at(-1).state,'ready');
});
test('cancel is not a download and keeps the same card available',async()=>{
 const r=rig();r.platform.navigator.share=()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'}));
 await r.controller.prepare();await r.controller.save();assert.equal(r.downloads.length,0);assert.match(r.changes.at(-1).message,/取り消し/);
 r.platform.navigator.share=payload=>{r.shares.push(payload);return Promise.resolve()};await r.controller.save();assert.equal(r.shares.length,1);assert.equal(r.makeCount,1);
});
for(const kind of ['missing-share','missing-canShare','canShare-throws','unsupported','missing-File','File-throws','share-rejected'])test('download fallback: '+kind,async()=>{
 const r=rig();
 if(kind==='missing-share')delete r.platform.navigator.share;
 if(kind==='missing-canShare')delete r.platform.navigator.canShare;
 if(kind==='canShare-throws')r.platform.navigator.canShare=()=>{throw Error('unavailable')};
 if(kind==='unsupported')r.platform.navigator.canShare=()=>false;
 if(kind==='missing-File')delete r.platform.File;
 if(kind==='File-throws')r.platform.File=class {constructor(){throw Error('unavailable')}};
 if(kind==='share-rejected')r.platform.navigator.share=()=>Promise.reject(Error('not allowed'));
 await r.controller.prepare();await r.controller.save();assert.deepEqual(r.downloads,[{filename:'kienaide-wish.png',url:'blob:card'}]);
 assert.match(r.changes.at(-1).message,/ダウンロードを開始/);assert.equal(r.timers.length,1);r.timers[0]();assert.deepEqual(r.revoked,['blob:card']);
});
for(const kind of ['null','throws'])test('PNG creation failure is recoverable: '+kind,async()=>{
 const r=rig();r.options.make=()=>({...r.input(),canvas:{toBlob:done=>{if(kind==='throws')throw Error('security');done(null)}}});
 await r.controller.prepare();assert.equal(r.changes.at(-1).state,'error');assert.equal(r.changes.at(-1).ready,false);
 r.options.make=r.input;await r.controller.save();assert.equal(r.changes.at(-1).state,'ready');assert.equal(r.downloads.length+r.shares.length,0,'retry prepares first; sharing needs another real tap');
});
test('download errors retain the prepared card, revoke its URL, and permit retry',async()=>{
 const r=rig();r.platform.navigator.canShare=()=>false;r.platform.document.createElement=()=>({click(){throw Error('blocked')},remove(){}});
 await r.controller.prepare();await r.controller.save();assert.equal(r.changes.at(-1).state,'error');assert.equal(r.changes.at(-1).ready,true);r.timers[0]();assert.deepEqual(r.revoked,['blob:card']);
 r.platform.document.createElement=()=>({click(){r.downloads.push(this.download)},remove(){}});await r.controller.save();assert.deepEqual(r.downloads,['kienaide-wish.png']);assert.equal(r.makeCount,1);
});
test('late PNG callbacks cannot overwrite the next journey or its card',async()=>{
 const r=rig(),callbacks=[];r.options.make=()=>({...r.input(),canvas:{toBlob:done=>callbacks.push(done)}});
 const old=r.controller.prepare();r.controller.reset();r.setScene('dawn');const next=r.controller.prepare();callbacks[0](r.png);await old;
 assert.equal(r.changes.at(-1).state,'preparing');await r.controller.save();assert.equal(callbacks.length,2,'old finally must not unlock the new busy state');
 callbacks[1](r.png);await next;await r.controller.save();assert.equal(r.shares[0].files[0].name,'kienaide-dawn.png');
});
test('reset invalidates a pending native share, including its error fallback',async()=>{
 const r=rig();let reject;r.platform.navigator.share=()=>new Promise((_,fail)=>{reject=fail});await r.controller.prepare();const pending=r.controller.save();r.controller.reset();const count=r.changes.length;
 reject(Error('late failure'));await pending;assert.equal(r.changes.length,count);assert.equal(r.downloads.length,0);assert.equal(r.changes.at(-1).state,'idle');
});
test('filename and text use the same captured ending even if preparation is asynchronous',async()=>{
 const r=rig();let finish;r.options.make=()=>({...r.input(),canvas:{toBlob:done=>{finish=done}}});const pending=r.controller.prepare();r.setScene('dawn');finish(r.png);await pending;await r.controller.save();
 assert.equal(r.shares[0].files[0].name,'kienaide-wish.png');assert.match(r.shares[0].text,/^wish /);
});
