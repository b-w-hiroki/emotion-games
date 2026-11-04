import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('assets/app.js','utf8');
const start=app.indexOf('function gustAnticipationProgress('),end=app.indexOf('\nconst reducedMotion=',start);
const progress=Function(app.slice(start,end)+';return gustAnticipationProgress')();
const state={chapter:0,finalePhase:'approach',oxygen:80,flame:72,event:{kind:'gust',warnAt:6.2,at:7.4}};
test('gust preview is opt-in and bounded by the existing warning interval',()=>{
 assert.equal(progress(state,6.8,false),null);
 assert.equal(progress(state,6.19,true),null);
 assert.equal(progress(state,6.2,true),0);
 assert.ok(Math.abs(progress(state,6.8,true)-.5)<1e-9);
 assert.equal(progress(state,7.4,true),null);
 assert.equal(progress(state,8,true),null);
 assert.match(app,/gustPreviewVariant=qa&&params\.get\('gustCue'\)==='anticipation'/);
});
test('preview cannot compete with critical guidance or other mechanics',()=>{
 for(const change of [{chapter:1},{oxygen:22},{flame:20},{event:null},{event:{kind:'eddy',warnAt:6.2,at:7.4}},{event:{kind:'gust',warnAt:7.4,at:7.4}},{finalePhase:'gust-warning'}])assert.equal(progress({...state,...change},6.8,true),null);
});
test('presentation calculation leaves state and its event unchanged',()=>{
 const before=JSON.stringify(state);for(let t=0;t<12;t+=.02)progress(state,t,true);
 assert.equal(JSON.stringify(state),before);
});
