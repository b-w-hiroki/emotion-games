import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const app=fs.readFileSync('assets/app.js','utf8');

test('Kienaide share URLs drop test presets without changing public route or anchors',()=>{
 const source=app.match(/^function currentUrl\(\)\{.*\}$/m)[0];
 const scope={URL,slug:'kienaide',location:{href:'https://play.birdman-studio.com/kienaide/?qa=1&seed=3&speed=12&t=80&mem=3&vital=breath&study=1&utm_source=test#ending'}};
 vm.runInNewContext(source+';result=currentUrl()',scope);
 assert.equal(scope.result,'https://play.birdman-studio.com/kienaide/#ending');
});

function readCollection(saved,legacy,writeBlocked=false){
 const data=new Map([['emotion-endings-v1-kienaide',JSON.stringify(saved)],['kienaide-art-endings-v1',JSON.stringify(legacy)]]);
 const scope={slug:'kienaide',endingList:['dawn','wish','survive','smother','blown'].map(id=>({id})),localStorage:{getItem:k=>data.get(k),setItem(k,v){if(writeBlocked)throw new Error('storage denied');data.set(k,v)}}};
 vm.runInNewContext(app.slice(app.indexOf('let collected=[];'),app.indexOf('const esc='))+';result=collected',scope);
 return {found:Array.from(scope.result),saved:JSON.parse(data.get('emotion-endings-v1-kienaide')),legacy:JSON.parse(data.get('kienaide-art-endings-v1'))};
}

test('duplicate discoveries neither inflate rewards nor mask a different legacy discovery',()=>{
 const result=readCollection(['dawn','dawn'],['wish']);
 assert.deepEqual(result.found,['dawn','wish']);assert.deepEqual(result.saved,['dawn','wish']);
 assert.deepEqual(result.legacy,['wish'],'the old save remains untouched');
});

test('blocked storage still exposes all valid unique discoveries for the current session',()=>{
 assert.deepEqual(readCollection(['dawn','dawn','unknown'],['wish','wish'],true).found,['dawn','wish']);
});
