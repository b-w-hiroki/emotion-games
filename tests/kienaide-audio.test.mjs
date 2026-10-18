import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/kienaide-audio.js','utf8');

function audioRig(saved='{}'){
 const stats={bufferStarts:0};
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}});
 const node=extra=>Object.assign({connect(){return this}},extra);
 class AudioContext{
  constructor(){this.currentTime=0;this.sampleRate=16;this.destination={};this.state='running'}
  createGain(){return node({gain:param()})}
  createDelay(){return node({delayTime:param()})}
  createBiquadFilter(){return node({frequency:param(),Q:param()})}
  createOscillator(){return node({frequency:param(),start(){},stop(){}})}
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
