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

test('personal journey count survives reload, rejects corrupt values and tolerates blocked storage',()=>{
 const source=app.slice(app.indexOf("const journeyKey='emotion-kienaide-journeys-v1';"),app.indexOf('const landscapeMode='));
 function load(raw,blocked=false){const data=new Map(raw===null?[]:[['emotion-kienaide-journeys-v1',raw]]);const scope={candle:true,JSON,Number,localStorage:{getItem:key=>data.get(key)||null,setItem(key,value){if(blocked)throw Error('denied');data.set(key,value)}},renderJourneyProgress(){}};vm.runInNewContext(source+';result={read:readJourneyProgress,sync:syncJourneyProgress,save:saveJourneyProgress,current:journeyProgress}',scope);return {scope,data}}
 const first=load(null);assert.deepEqual(JSON.parse(JSON.stringify(first.scope.result.current)),{started:0,completed:0});first.scope.result.save('started');first.scope.result.save('completed');assert.deepEqual(JSON.parse(first.data.get('emotion-kienaide-journeys-v1')),{started:1,completed:1});
 assert.deepEqual(JSON.parse(JSON.stringify(load(first.data.get('emotion-kienaide-journeys-v1')).scope.result.current)),{started:1,completed:1});
 assert.deepEqual(JSON.parse(JSON.stringify(load('{"started":3,"completed":99}').scope.result.current)),{started:3,completed:3});
 assert.deepEqual(JSON.parse(JSON.stringify(load('{"started":-1,"completed":"7"}').scope.result.current)),{started:0,completed:0});
 const blocked=load('broken',true);blocked.scope.result.save('started');assert.equal(blocked.scope.result.current.started,1);
 const tab=load(null);tab.data.set('emotion-kienaide-journeys-v1',JSON.stringify({started:3,completed:2}));tab.scope.result.sync();assert.deepEqual(JSON.parse(JSON.stringify(tab.scope.result.current)),{started:3,completed:2},'opening an older tab observes newer journeys');
 tab.data.set('emotion-kienaide-journeys-v1','broken');tab.scope.result.sync();assert.deepEqual(JSON.parse(JSON.stringify(tab.scope.result.current)),{started:3,completed:2},'invalid storage cannot erase in-memory progress');
});
