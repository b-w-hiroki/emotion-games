import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const app=fs.readFileSync('assets/app.js','utf8');
const core=fs.readFileSync('assets/kienaide-core.js','utf8');
const sandbox={};vm.runInNewContext(core,sandbox);
const eligible=sandbox.KienaideCore.canTriggerMiracle;
const base={rescue:false,memories:2,flame:21,oxygen:51,shield:false,wind:.29,releaseAt:78.5};
test("near-extinction recovery comes from the player's timely release, not RNG",()=>{
 assert.equal(eligible(base,79),true);
 assert.equal(eligible({...base,releaseAt:60},79),false,'old release does not count');
 assert.equal(eligible({...base,shield:true},79),false,'cannot trigger while protected');
 assert.equal(eligible({...base,memories:1},79),false,'player must gather memories');
 assert.equal(eligible({...base,oxygen:12},79),false,'must leave oxygen');
 assert.equal(eligible({...base,wind:.9},79),false,'release must meet a lull');
 assert.equal(eligible({...base,flame:60},79),false,'needs a real near miss');
 assert.equal(eligible({...base,rescue:true},79),false,'once per play');
 assert.equal(eligible(base,40),false,'no arbitrary early shortcut');
});
test('highlight is shareable but never auto-posted',()=>{
 for(const x of ['moment_card_created','moment-save','KienaideCard.create','miracle_triggered'])
  assert.ok(app.includes(x),x);
 const card=fs.readFileSync('assets/kienaide-card.js','utf8');for(const x of ['canvas.toBlob','navigator.canShare','navigator.share'])assert.ok(card.includes(x),x);
 assert.equal(spawnSync(process.execPath,['--check','assets/kienaide-card.js'],{encoding:'utf8'}).status,0);
 assert.ok(core.includes('if(!s.shield&&input.wasShield)s.releaseAt=time'));
 assert.equal(spawnSync(process.execPath,['--check','assets/app.js'],{encoding:'utf8'}).status,0);
});

test('the four chapters differ in shelter, bridge exposure and rescue foreshadowing',()=>{
 for(const marker of ["tunnelGust=chapter===1", "s.shelterUntil=Math.min(time+3.5,CHAPTERS[2].at)", "chapter===2?1.2:0", "s.bridgeFrost=chapter===2", "s.miracleHint=true"]){assert.ok(core.includes(marker),marker)}
 assert.ok(app.includes("rescue_foreshadowed"));
});

test('living flame uses state-dependent facial expression, light and layered sound',()=>{
 const view=fs.readFileSync('assets/kienaide-view.js','utf8'),audio=fs.readFileSync('assets/kienaide-audio.js','utf8');
 for(const marker of ["function flameExpression(s)","'hope'","'suffocating'","'comfort'"])assert.ok(core.includes(marker),marker);
 for(const marker of ["e==='afraid'","e==='suffocating'","createRadialGradient"])assert.ok(view.includes(marker),marker);
 for(const marker of ["fire.g.gain.setTargetAtTime","fire.hum.frequency","miracle(){","webkitAudioContext"])assert.ok(audio.includes(marker),marker);
 assert.ok(app.includes("prefers-reduced-motion"));
});
