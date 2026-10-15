import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const ctx={window:{}};
vm.runInNewContext(fs.readFileSync('assets/microgames.js','utf8'),ctx,{timeout:2000});
vm.runInNewContext(fs.readFileSync('assets/pilots.js','utf8'),ctx,{timeout:2000});
const M=ctx.window.EmotionMissions;
const paint=new Proxy({}, {get:(obj,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
const collect=(s)=>{const results=[];return {end:(id,score)=>results.push({id,score}),results}};
test('four pilots have separate play models, not only alternate colors',()=>{
 assert.equal(M.pilotIds.length,4);
 assert.equal(new Set(M.pilotIds).size,4);
 for(const name of M.pilotIds) assert.ok(M.makeState(name).special?.kind);
 assert.deepEqual(Array.from(M.pilotIds.map(slug=>M.makeState(slug).special.kind)),['chase','glide','echo','narrative']);
});
test('light is captured by tapping moving coordinates',()=>{
 const s=M.makeState('hikari-oikake'),r=collect(s),t=1.8,pos=M.lightPosition(t);
 M.canvasTap(s,pos.x,pos.y,t,r.end);
 M.frame(paint,s,t+.38,.016,r.end);
 assert.equal(r.results[0]?.id,'perfect');
});
test('holding paper airplane changes flight height, unlike a timing stop',()=>{
 const s=M.makeState('tobo'),r=collect(s),h=s.special.height;
 M.down(s,1);
 for(let i=1;i<=130;i++)M.frame(paint,s,1+i/60,1/60,r.end);
 assert.ok(s.special.height>h+15,'sustained lift must raise paper plane');
 M.up(s);
 assert.equal(s.hold,false);
});
test('echo memory game uses four nonuniform intervals',()=>{
 const s=M.makeState('hibiki'),r=collect(s);
 for(const t of [4.1,4.9,5.45,6.55])M.tap(s,t,r.end);
 assert.equal(r.results[0]?.id,'perfect');
});
test('umbrella scenarios respond to left/right story choices',()=>{
 const s=M.makeState('kasa-o'),r=collect(s);
 M.canvasTap(s,100,200,1,r.end);
 M.canvasTap(s,250,200,2,r.end);
 M.tap(s,3,r.end);
 assert.equal(r.results[0]?.id,'mixed');
 assert.equal(s.special.choices.join(','),'0,1,0');
});
test('legacy titles still use their existing engine',()=>{
 for(const slug of ['ato-isshun','fuusen','se-no','okaeri']){
  assert.equal(M.makeState(slug).special,undefined);
 }
});
test('research mode is explicit opt-in and exportable',()=>{
 const study=fs.readFileSync('assets/experiment.js','utf8');
 for(const needle of ["query.get('study')!=='1'","emotion-games-study-v1","study-export","duration_ms","inputs:current.inputs","window.emotionTrack","answered:false","study-clear"])assert.ok(study.includes(needle),needle);
 for(const file of ['assets/pilots.js','assets/experiment.js']){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }
});
