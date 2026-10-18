// 004「きえないで。」 sound. Web Audio only, created on the first user gesture (Safari/WebKit
// autoplay rules). Layers: wind, fire, footsteps, a sparse chapter melody, event cues and
// ending stingers. Silence is used on purpose before the window answers.
(function(root){'use strict';
const KEY='emotion-kienaide-audio-v1';
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return {muted:!!v.muted,volume:typeof v.volume==='number'?Math.min(1,Math.max(0,v.volume)):.8}}catch(_){return {muted:false,volume:.8}}}
function save(p){try{localStorage.setItem(KEY,JSON.stringify(p))}catch(_){}}
// Pentatonic melody fragments per chapter (MIDI note numbers). Sparse on purpose.
const SCALES=[[69,72,74,76,79],[67,69,72,74,76],[64,67,69,71,74],[72,74,76,79,81]];
const CHORDS=[[57,64,69],[55,62,67],[52,59,64],[60,64,67,72]];
const midi=n=>440*Math.pow(2,(n-69)/12);
function breathProfile(oxygen){if(oxygen>36)return null;const urgency=1-Math.max(0,oxygen)/36;return {urgency,interval:3.2-urgency*1.3,gain:.012+urgency*.023,frequency:760-urgency*260}}
function create(){
 const prefs=load();
 let ac=null,master=null,bus=null,wind=null,fire=null,steps=null,pad=null,nextNote=0,noteIndex=0,lastStep=0,nextBreath=0,chapter=-1;
 function init(){
  if(ac)return true;
  const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return false;
  try{ac=new AC()}catch(_){ac=null;return false}
  master=ac.createGain();master.gain.value=prefs.muted?0:prefs.volume*.5;master.connect(ac.destination);
  // A short feedback delay stands in for reverb and softens every note.
  bus=ac.createGain();const delay=ac.createDelay(1),fb=ac.createGain(),wet=ac.createGain();delay.delayTime.value=.33;fb.gain.value=.32;wet.gain.value=.35;
  bus.connect(master);bus.connect(delay);delay.connect(fb).connect(delay);delay.connect(wet).connect(master);
  const noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const loop=()=>{const s=ac.createBufferSource();s.buffer=noise;s.loop=true;s.start();return s};
  // Wind: band-limited noise with a slowly moving filter and stereo pan.
  {const src=loop(),f=ac.createBiquadFilter(),g=ac.createGain(),p=ac.createStereoPanner?ac.createStereoPanner():null;f.type='bandpass';f.frequency.value=500;f.Q.value=.6;g.gain.value=0;src.connect(f).connect(g);if(p){g.connect(p).connect(master)}else g.connect(master);wind={f,g,p}}
  // Fire: crackle = noise through a highpass with a jittered gain, plus a low warm hum.
  {const src=loop(),f=ac.createBiquadFilter(),g=ac.createGain(),hum=ac.createOscillator(),hg=ac.createGain(),hf=ac.createBiquadFilter();f.type='highpass';f.frequency.value=2400;g.gain.value=0;src.connect(f).connect(g).connect(master);hum.type='triangle';hum.frequency.value=110;hf.type='lowpass';hf.frequency.value=320;hg.gain.value=0;hum.connect(hf).connect(hg).connect(master);hum.start();fire={g,hg,hum,hf}}
  steps={noise};
  pad={voices:[]};
  return true;
 }
 function resume(){if(ac&&ac.state==='suspended')ac.resume().catch(()=>{})}
 function suspend(){if(ac&&ac.state==='running')ac.suspend().catch(()=>{})}
 // Simulation time returns to zero on retry; audio preferences and the context do not.
 function startJourney(){nextNote=0;noteIndex=0;lastStep=0;nextBreath=0;chapter=-1}
 function setMuted(m){prefs.muted=!!m;save(prefs);if(master)master.gain.setTargetAtTime(prefs.muted?0:prefs.volume*.5,ac.currentTime,.05)}
 function setVolume(v){prefs.volume=Math.min(1,Math.max(0,v));if(prefs.volume>0&&prefs.muted)prefs.muted=false;save(prefs);if(master)master.gain.setTargetAtTime(prefs.muted?0:prefs.volume*.5,ac.currentTime,.05)}
 function tone(freq,dur=.6,vol=.12,type='sine',when=0,dest){
  if(!ac||prefs.muted)return;const t=ac.currentTime+when,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(dest||bus);o.start(t);o.stop(t+dur+.05);
 }
 function bell(note,when=0,vol=.09){tone(midi(note),1.6,vol,'sine',when);tone(midi(note+12),.7,vol*.35,'sine',when)}
 function whoosh(dur=1.2,up=true,vol=.18){
  if(!ac||prefs.muted)return;const t=ac.currentTime,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=steps.noise;f.type='bandpass';f.Q.value=1.2;
  f.frequency.setValueAtTime(up?300:1400,t);f.frequency.exponentialRampToValueAtTime(up?1600:250,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+dur+.05);
 }
 function thump(vol=.06,freq=180){
  if(!ac||prefs.muted)return;const t=ac.currentTime,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=steps.noise;f.type='lowpass';f.frequency.value=freq;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);s.connect(f).connect(g).connect(master);s.start(t,Math.random());s.stop(t+.2);
 }
 function breathCue(profile){
  if(!ac||prefs.muted||!profile)return;const t=ac.currentTime,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=steps.noise;f.type='bandpass';f.frequency.value=profile.frequency;f.Q.value=.55;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(profile.gain,t+.22);g.gain.exponentialRampToValueAtTime(.0001,t+.9);s.connect(f).connect(g).connect(master);s.start(t,Math.random());s.stop(t+.95);
 }
 function setPad(ch){
  if(!ac)return;const t=ac.currentTime;
  for(const v of pad.voices){v.g.gain.setTargetAtTime(0,t,.8);v.o.stop(t+4)}
  pad.voices=CHORDS[ch].map(n=>{const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();o.type='sawtooth';o.frequency.value=midi(n-12);f.type='lowpass';f.frequency.value=600;g.gain.value=0;o.connect(f).connect(g).connect(bus);o.start();g.gain.setTargetAtTime(.012,t,1.5);return {o,g}});
 }
 // Called every frame with the simulation state; drives continuous layers and the melody clock.
 function update(s,time,o){
  if(!ac)return;const t=ac.currentTime,quiet=s.finalePhase==='silence'||s.finalePhase==='window-reply'||(s.rescue&&time-s.rescueAt<.5)||o.ended;
  if(s.chapter!==chapter){chapter=s.chapter;setPad(chapter)}
  const w=Math.min(1.15,s.wind||0);
  wind.g.gain.setTargetAtTime(quiet?0:.03+w*.16,t,.12);wind.f.frequency.setTargetAtTime(380+w*900,t,.3);if(wind.p)wind.p.pan.setTargetAtTime(Math.sin(time*.4)*.5*w,t,.3);
  const life=Math.max(0,Math.min(1,s.flame/100));
  fire.g.gain.setTargetAtTime(quiet||life<=0?0:(.004+Math.random()*.012)*life*(s.shield?.55:1),t,.03);
  fire.hg.gain.setTargetAtTime(quiet||life<=0?0:.02*life,t,.2);
  fire.hum.frequency.setTargetAtTime(s.oxygen<24?82:s.rescue||s.reply>0?165:110+life*30,t,.2);
  if(!quiet&&o.playing&&time-lastStep>.55){lastStep=time;thump(.035+w*.02,150+Math.random()*60)}
  const breath=breathProfile(s.oxygen);if(!quiet&&breath&&t>=nextBreath){breathCue(breath);nextBreath=t+breath.interval}
  if(s.oxygen<24&&!quiet&&Math.floor(time*1.4)!==Math.floor((time-o.dt)*1.4))tone(98,.18,.12,'sine',0,master);
  // Sparse melody: one note every ~1.6–2.4 s, quieter when wind is high, stops in the finale storm.
  if(!quiet&&s.finalePhase==='approach'&&time>=nextNote){const sc=SCALES[chapter];noteIndex=(noteIndex+1+(Math.floor(time*3)%3))%sc.length;bell(sc[noteIndex],0,.05*(1-w*.5));nextNote=time+1.6+((noteIndex*7)%5)*.2}
  for(const v of pad.voices)v.g.gain.setTargetAtTime(quiet?0:.012,t,.4);
 }
 // Prologue bed: a quiet room with the hearth, then the wind outside.
 function ambient(windLevel,flameLevel){
  if(!ac)return;const t=ac.currentTime;
  wind.g.gain.setTargetAtTime(.02+windLevel*.14,t,.3);wind.f.frequency.setTargetAtTime(380+windLevel*700,t,.4);
  fire.g.gain.setTargetAtTime((.004+Math.random()*.01)*flameLevel,t,.03);fire.hg.gain.setTargetAtTime(.018*flameLevel,t,.3);
 }
 const cues={
  event(kind){if(kind==='gust'||kind==='eddy')whoosh(1.1,true,.16);else if(kind==='lantern')bell(76,0,.07);else if(kind==='lull')whoosh(1.6,false,.06)},
  gustWarning(){whoosh(1.8,true,.22)},
  shield(on){thump(on?.05:.03,on?320:520)},
  memory(n){bell(76+n*2,0,.1);bell(83+n*2,.18,.07)},
  chapter(){bell(64,0,.06)},
  reply(level){if(level==='bright'){bell(72,.1,.1);bell(76,.5,.09);bell(79,.9,.09);bell(84,1.3,.08)}else if(level==='faint')bell(72,.2,.06)},
  miracle(){[67,71,74,79].forEach((n,i)=>bell(n,i*.18,.08))},
  ending(id){
   if(!ac)return;for(const v of pad.voices)v.g.gain.setTargetAtTime(0,ac.currentTime,.6);
   const seq={blown:[[64,0],[62,.5],[57,1.1]],smother:[[57,0],[55,.7]],wish:[[76,0],[79,.45],[83,.9],[88,1.5]],survive:[[69,0],[72,.6],[74,1.3]],dawn:[[60,0],[64,.25],[67,.5],[72,.8],[76,1.2],[79,1.6]]}[id]||[];
   for(const [n,w] of seq)bell(n,w,id==='blown'||id==='smother'?.07:.09);
   if(id==='dawn')CHORDS[3].forEach(n=>tone(midi(n),3.5,.035,'triangle',1.2));
  },
  // The flame's small voice: two soft rising blips, never words.
  voice(){tone(880,.12,.05,'sine');tone(1175,.16,.045,'sine',.11)}
 };
 return {init,resume,suspend,startJourney,update,ambient,cues,setMuted,setVolume,get muted(){return prefs.muted},get volume(){return prefs.volume},get ready(){return !!ac},get state(){return ac?ac.state:'none'}};
}
root.KienaideAudio={create,KEY,breathProfile};
})(typeof window!=='undefined'?window:globalThis);
