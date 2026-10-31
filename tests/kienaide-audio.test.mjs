import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/kienaide-audio.js','utf8');

function audioRig(saved='{}',opts={}){
 const stats={bufferStarts:0,oscillatorStarts:0,melodyStarts:0,gainTargets:[],oscillators:[],buffers:[]};
 const pending=[];
 const param=onTarget=>({value:0,setValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v;onTarget?.(v)},exponentialRampToValueAtTime(){}});
 const node=extra=>Object.assign({connect(){return this}},extra);
 class AudioContext{
  constructor(){this.currentTime=0;this.sampleRate=16;this.destination={};this.state=opts.initialState||'running';this.listeners={};stats.context=this}
  addEventListener(type,listener){this.listeners[type]=listener}
  externalState(next){this.state=next;this.listeners.statechange?.()}
  resume(){return this.transition('running')}
  suspend(){return this.transition('suspended')}
  transition(next){if(!opts.defer){this.state=next;if(opts.syncEvents)this.listeners.statechange?.();return Promise.resolve()}return new Promise(resolve=>pending.push({next,finish:()=>{this.state=next;resolve()}}))}
  createGain(){return node({gain:param(v=>stats.gainTargets.push(v))})}
  createDelay(){return node({delayTime:param()})}
  createBiquadFilter(){return node({frequency:param(),Q:param()})}
  createOscillator(){const o=node({frequency:param(),stops:[],start(t=0){this.startsAt=t;stats.oscillatorStarts++;if(this.type==='sine')stats.melodyStarts++},stop(t=0){this.stops.push(t)}});stats.oscillators.push(o);return o}
  createStereoPanner(){return node({pan:param()})}
  createBuffer(_,length){return {getChannelData(){return new Float32Array(length)}}}
  createBufferSource(){const b=node({buffer:null,stops:[],start(){stats.bufferStarts++},stop(t=0){this.stops.push(t)},loop:false});stats.buffers.push(b);return b}
 }
 const scope={AudioContext,localStorage:{getItem(){return saved},setItem(){}}};
 vm.runInNewContext(source,scope);
 const audio=scope.KienaideAudio.create();audio.init();
 return {audio,stats,pending};
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

test('retry cancels sounding and future ending notes without stopping ambience',()=>{
 const {audio,stats}=audioRig();
 audio.cues.ending('dawn');
 const endingNotes=stats.oscillators.filter(o=>o.stops.length);
 assert.ok(endingNotes.some(o=>o.startsAt>0),'the ending includes notes scheduled after the current time');
 assert.ok(endingNotes.some(o=>o.startsAt===0),'the ending also includes a sounding note');
 audio.startJourney();
 assert.ok(endingNotes.every(o=>o.stops.at(-1)===0),'every previous note is stopped at retry time');
 assert.ok(stats.buffers.filter(b=>b.loop).every(b=>b.stops.length===0),'the existing wind and fire loops survive');
 const count=stats.melodyStarts;audio.update(state(80),1,{playing:true,dt:1/60,ended:false});
 assert.equal(stats.melodyStarts,count+2,'the new journey can play its own melody');
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

test('unmuting after zero volume restores the previous audible level',()=>{
 const {audio,stats}=audioRig();audio.setVolume(.35);audio.setVolume(0);
 assert.equal(audio.muted,true);assert.equal(audio.volume,.35,'keep the last audible level');
 audio.setMuted(false);assert.equal(audio.muted,false);assert.equal(audio.volume,.35);
 assert.equal(stats.gainTargets.at(-1),.175,'unmuting actually restores audible gain');
 const legacy=audioRig('{"muted":true,"volume":0}').audio;
 assert.equal(legacy.muted,true);legacy.setMuted(false);assert.ok(legacy.volume>0,'old zero-volume saves remain muted until explicitly enabled');
 const inconsistent=audioRig('{"muted":false,"volume":0}').audio;assert.equal(inconsistent.muted,true,'an old false ON state remains silent');inconsistent.setMuted(false);assert.ok(inconsistent.volume>0,'explicitly enabling it restores audible volume');
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

test('a missed memory has a quiet cue that obeys mute',()=>{
 const audible=audioRig();const before=audible.stats.oscillatorStarts;audible.audio.cues.memoryLost();
 assert.equal(audible.stats.oscillatorStarts-before,4,'two soft descending bells are scheduled');
 const muted=audioRig('{"muted":true}');const mutedBefore=muted.stats.oscillatorStarts;muted.audio.cues.memoryLost();assert.equal(muted.stats.oscillatorStarts,mutedBefore);
});
test('discovering shelter has a restrained cue that obeys mute',()=>{
 const audible=audioRig();const before=audible.stats.oscillatorStarts;audible.audio.cues.shelter();
 assert.equal(audible.stats.oscillatorStarts-before,4,'two soft bells mark the shelter');
 const muted=audioRig('{"muted":true}');const mutedBefore=muted.stats.oscillatorStarts;muted.audio.cues.shelter();
 assert.equal(muted.stats.oscillatorStarts,mutedBefore);
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

test('audio follows the active journey, modal dialogs and background state',async()=>{
 const {audio}=audioRig();
 audio.suspend();assert.equal(audio.state,'suspended');
 audio.resume();await new Promise(setImmediate);assert.equal(audio.state,'running');
 const app=fs.readFileSync('assets/app.js','utf8');
 const lifecycle=app.match(/function syncCandleAudio\(\)\{([^\n]+)\}/)[1];
 for(const [mode,candleDialog,expected] of [['intro',null,'resume'],['intro',{id:'kienaide-intro'},'resume'],['play',null,'resume'],['play',{id:'journey-menu'},'suspend'],['play',{id:'collection-panel'},'suspend'],['play',{id:'route-choice'},'suspend'],['end',null,'resume'],['end',{id:'collection-panel'},'suspend']]){
  const calls=[],context={candle:true,candleWindowFocused:true,mode,candleDialog,chapterLoading:false,document:{hidden:false},landscapeMode:{matches:false},KA:{ready:true,resume:()=>calls.push('resume'),suspend:()=>calls.push('suspend')}};
  vm.runInNewContext('(function(){'+lifecycle+'})()',context);assert.deepEqual(calls,expected?[expected]:[],mode+' '+candleDialog?.id);
  context.chapterLoading=true;calls.length=0;vm.runInNewContext('(function(){'+lifecycle+'})()',context);assert.deepEqual(calls,['suspend']);context.chapterLoading=false;
  context.document.hidden=true;calls.length=0;vm.runInNewContext('(function(){'+lifecycle+'})()',context);assert.deepEqual(calls,['suspend']);
  context.document.hidden=false;context.candleWindowFocused=false;calls.length=0;vm.runInNewContext('(function(){'+lifecycle+'})()',context);assert.deepEqual(calls,['suspend']);context.candleWindowFocused=true;
  context.document.hidden=false;context.landscapeMode.matches=true;calls.length=0;vm.runInNewContext('(function(){'+lifecycle+'})()',context);assert.deepEqual(calls,['suspend']);
 }
 assert.ok(app.includes("document.addEventListener('visibilitychange',()=>{last=0;syncCandleAudio()})"),'visibility changes must apply the shared audio policy');
 const clock=app.match(/const syncClock=\(\)=>\{([^\n]+)\};/)[1];
 const c={performance:{now:()=>c.now},now:0,clockAt:0,clockPaused:false,introTime:0,speed:1,document:{hidden:false},candleWindowFocused:true,landscapeMode:{matches:false}};
 const sync=()=>vm.runInNewContext('(function(){'+clock+'})()',c);
 c.now=500;c.candleWindowFocused=false;sync();
 c.now=2500;c.candleWindowFocused=true;sync();
 c.now=3000;sync();
 assert.equal(c.introTime,1,'an interruption without animation frames does not advance intro time');
 for(const event of ['blur','focus'])assert.ok(app.includes("window.addEventListener('"+event+"',syncClock)"));
 assert.ok(app.includes('skipped:introTime<iv.INTRO_LENGTH'),'background time must not distort the intro skip metric');
});

test('a pause while resume is pending still suspends after the gesture resolves',async()=>{
 const {audio,pending}=audioRig('{}',{defer:true,initialState:'suspended'});
 audio.resume();assert.deepEqual(pending.map(x=>x.next),['running']);
 audio.suspend();assert.equal(audio.state,'suspended');
 pending.shift().finish();await new Promise(setImmediate);
 assert.deepEqual(pending.map(x=>x.next),['suspended']);
 pending.shift().finish();await new Promise(setImmediate);
 assert.equal(audio.state,'suspended');assert.deepEqual(pending,[]);
});

test('returning to play during a pending suspend resumes after the pause settles',async()=>{
 const {audio,pending}=audioRig('{}',{defer:true});
 audio.suspend();assert.deepEqual(pending.map(x=>x.next),['suspended']);
 audio.resume();pending.shift().finish();await new Promise(setImmediate);
 assert.deepEqual(pending.map(x=>x.next),['running']);
 pending.shift().finish();await new Promise(setImmediate);
 assert.equal(audio.state,'running');assert.deepEqual(pending,[]);
});

test('an operating-system audio interruption cannot restart sound during a pause',async()=>{
 const {audio,stats}=audioRig();
 audio.suspend();await new Promise(setImmediate);assert.equal(audio.state,'suspended');
 stats.context.externalState('interrupted');
 stats.context.externalState('running');await new Promise(setImmediate);
 assert.equal(audio.state,'suspended','a spontaneous system resume must be corrected while the game is paused');
 audio.resume();await new Promise(setImmediate);assert.equal(audio.state,'running','sound resumes normally after returning to play');
});

test('synchronous state changes cannot reenter the audio transport',async()=>{
 const {audio}=audioRig('{}',{syncEvents:true});
 audio.suspend();await new Promise(setImmediate);assert.equal(audio.state,'suspended');
 audio.resume();await new Promise(setImmediate);assert.equal(audio.state,'running');
});
