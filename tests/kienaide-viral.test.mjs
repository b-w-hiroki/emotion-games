import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const app=fs.readFileSync('assets/app.js','utf8');
const match=app.match(/function canTriggerMiracle\(s,time\)\{[\s\S]*?\n\}/);
assert.ok(match,'Player-triggered near-miss rescue condition must exist');
const eligible=vm.runInNewContext('('+match[0]+')');
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
 for(const x of ['moment_card_created','moment-save','card.toBlob','navigator.canShare','miracle_triggered','releaseAt=elapsed'])
  assert.ok(app.includes(x),x);
 assert.equal(spawnSync(process.execPath,['--check','assets/app.js'],{encoding:'utf8'}).status,0);
});

test('the four chapters differ in shelter, bridge exposure and rescue foreshadowing',()=>{
 for(const marker of ["tunnelGust=chapter===1", "s.shelterUntil=elapsed+3.5", "chapter===2?1.2:0", "bridgeCold=chapter===2?.62:1", "rescue_foreshadowed", "s.miracleHint=true"]){assert.ok(app.includes(marker),marker)}
});
