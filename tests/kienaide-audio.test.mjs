import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/kienaide-audio.js','utf8');

function audioRig(saved='{}'){
 const stats={bufferStarts:0,oscillatorStarts:0,melodyStarts:0,gainTargets:[]};
 const param=onTarget=>({value:0,setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v;onTarget?.(v)},exponentialRampToValueAtTime(){}});
 const node=extra=>Object.assign({connect(){return this}},extra);
 class AudioContext{
  constructor(){this.currentTime=0;this.sampleRate=16;this.destination={};this.state='running'}
  resume(){this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  createGain(){return node({gain:param(v=>stats.gainTargets.push(v))})}
  createDelay(){return node({delayTime:param()})}
  createBiquadFilter(){return node({frequency:param(),Q:param()})}
  createOscillator(){return node({frequency:param(),start(){stats.oscillatorStarts++;if(this.type==='sine')stats.melodyStarts++},stop(){}})}
  createStereoPanner(){return node({pan:param()})}
  createBuffer(_,length){return {getChannelData(){return new Float32Array(length)}}}
  createBufferSource(){return node({buffer:null,start(){stats.bufferStarts++},stop(){},loop:false})}
 }
 const scope={AudioContext,localStorage:{getItem(){return saved},setItem(){}}};
 vm.runInNewContext(source,scope);
 const audio=scope.KienaideAudio.create();audio.init();
 return {audio,stats};
}

function state(oxygen,finalePhase='approach'){
 return {chapter:0,wind:.1,flame:50,oxygen,shield:false,finalePhase,rescue:false,reply:0};
}

test('every retry immediately restores footsteps and melody without recreating ambience',()=>{
 const {audio,stats}=audioRig();
 const options={playing:true,dt:1/60,ended:false};
 for(const endTime of [82,98,14]){
  audio.update({...state(80),chapter:3},endTime,options);
  const buffers=stats.bufferStarts,melody=stats.melodyStarts;
  audio.startJourney();
  assert.equal(stats.bufferStarts,buffers,'reset must not duplicate the ambient loops');
  audio.update(state(80),1,options);
  assert.equal(stats.bufferStarts-buffers,1,'the new journey has a footstep in its first second');
  assert.equal(stats.melodyStarts-melody,2,'the new journey has its two-voice melody immediately');
 }
});

test('retry preserves mute, volume and the existing audio context',()=>{
 const {audio,stats}=audioRig('{"muted":true,"volume":0.35}');
 audio.startJourney();audio.init();
 audio.update(state(80),1,{playing:true,dt:1/60,ended:false});
 assert.equal(audio.muted,true);assert.equal(audio.volume,.35);
 assert.equal(stats.bufferStarts,2,'only the original ambient loops exist while muted');
 assert.equal(stats.melodyStarts,0);
 audio.setMuted(false);audio.startJourney();
 audio.update(state(80),1,{playing:true,dt:1/60,ended:false});
 assert.equal(stats.bufferStarts,3);assert.equal(stats.melodyStarts,2);
 assert.equal(audio.volume,.35);assert.equal(audio.state,'running');
});

test('breathing cue grows more frequent and present as oxygen becomes critical',()=>{
 const {breathProfile}=(()=>{const scope={};vm.runInNewContext(source,scope);return scope.KienaideAudio})();
 assert.equal(breathProfile(37),null,'normal breathing stays out of the score');
 const warning=breathProfile(36),critical=breathProfile(0);
 assert.equal(warning.urgency,0);
 assert.ok(critical.urgency>warning.urgency);
 assert.ok(critical.interval<warning.interval);
 assert.ok(critical.gain>warning.gain);
 assert.ok(critical.frequency<warning.frequency);
});

test('breathing sound is scheduled only while audible play is in a low-oxygen state',()=>{
 const options={playing:true,dt:1/60,ended:false};
 const urgent=audioRig();
 urgent.audio.update(state(20),0,options);
 assert.equal(urgent.stats.bufferStarts,3,'two ambience loops plus one breath cue');

 const quiet=audioRig();
 quiet.audio.update(state(20,'silence'),0,options);
 assert.equal(quiet.stats.bufferStarts,2,'the intentional finale silence remains silent');

 const recovered=audioRig();
 recovered.audio.update(state(37),0,options);
 assert.equal(recovered.stats.bufferStarts,2,'breathing returns to quiet above the threshold');

 const muted=audioRig('{"muted":true}');
 muted.audio.update(state(20),0,options);
 assert.equal(muted.stats.bufferStarts,2,'mute suppresses the breath cue');
});

test('the window reply keeps the storm silent while its answer stinger plays',()=>{
 const {audio,stats}=audioRig();
 audio.update(state(80,'window-reply'),89,{playing:true,dt:1/60,ended:false});
 assert.deepEqual(stats.gainTargets.slice(-6),[0,0,0,0,0,0],'wind, fire and the chapter pad stay silent through the reply');
 const before=stats.oscillatorStarts;
 audio.cues.reply('bright');
 assert.equal(stats.oscillatorStarts-before,8,'the window still answers with its bright four-note stinger');
});

test('pausing mutes the scene and schedules no footsteps, breath or melody until resuming',()=>{
 const {audio,stats}=audioRig(),options={playing:true,dt:1/60,ended:false};
 audio.update(state(20),1,options);
 const before={buffers:stats.bufferStarts,melody:stats.melodyStarts};
 for(const time of [2,10,20])audio.update(state(20),time,{...options,paused:true});
 assert.equal(stats.bufferStarts,before.buffers);assert.equal(stats.melodyStarts,before.melody);
 assert.deepEqual(stats.gainTargets.slice(-6),[0,0,0,0,0,0]);
 audio.update(state(80),4,options);
 assert.equal(stats.bufferStarts,before.buffers+1);assert.equal(stats.melodyStarts,before.melody+2);
});

test('audio suspends in the background and resumes for both the intro and active play',async()=>{
 const {audio}=audioRig();
 audio.suspend();assert.equal(audio.state,'suspended');
 audio.resume();await Promise.resolve();assert.equal(audio.state,'running');
 const app=fs.readFileSync('assets/app.js','utf8');
 const lifecycle=app.match(/document\.addEventListener\('visibilitychange',(\(\)=>\{last=0;[^\n]+\})\);/)[1];
 for(const [mode,candleDialog,resumes,collectionFromMenu=false] of [['intro',null,true],['intro',{id:'kienaide-intro'},true],['play',null,true],['play',{id:'journey-menu'},false],['play',{id:'collection-panel'},false,true],['play',{id:'collection-panel'},true],['play',{id:'route-choice'},true],['end',null,false]]){
  const calls=[],context={mode,candleDialog,collectionFromMenu,last:2,document:{hidden:false},KA:{resume:()=>calls.push('resume'),suspend:()=>calls.push('suspend')}};
  vm.runInNewContext('('+lifecycle+')()',context);assert.equal(context.last,0);assert.deepEqual(calls,resumes?['resume']:[],mode+' '+candleDialog?.id);
  context.document.hidden=true;calls.length=0;vm.runInNewContext('('+lifecycle+')()',context);assert.deepEqual(calls,['suspend']);
 }
 assert.ok(app.includes('((wasHidden?hiddenAt:now)-t0)/1000*speed'),'time spent in a background tab must not skip the intro');
 assert.ok(app.includes('skipped:introTime<iv.INTRO_LENGTH'),'background time must not distort the intro skip metric');
});
