import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../assets/kienaide-core.js';

const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const start=app.indexOf('function candleCaption(s){'),end=app.indexOf('\nfunction drawCandle',start);
assert.ok(start>=0&&end>start,'caption function remains available for contract tests');
const caption=Function('elapsed',app.slice(start,end)+'\nreturn candleCaption;')(12);
const actionCopy=Function(app.slice(start,end)+'\nreturn candleActionCopy;')();
const base={flame:18,oxygen:80,wind:.2,chapter:0,bridgeFrost:0,finalePhase:'approach',shield:false,memories:0};

test('weak wind tells a weakened traveller to recover breath instead of wasting it',()=>{
 assert.deepEqual(caption({...base,shield:true}),['風が弱い — いま離して',false]);
 assert.deepEqual(caption(base),['風が弱い — 息を戻して',false]);
 const K=globalThis.KienaideCore,open=K.create({seed:1}),held=K.create({seed:1});
 open.flame=held.flame=18;open.oxygen=held.oxygen=55;
 K.step(open,0,1,{shield:false,wasShield:false,releaseIntent:false});
 K.step(held,0,1,{shield:true,wasShield:false,releaseIntent:false});
 assert.ok(open.flame>held.flame,'uncovered calm flame recovers faster');
 assert.ok(open.oxygen>held.oxygen,'breath also recovers while hands are open');
});

test('critical guidance still protects against wind and bridge frost',()=>{
 assert.match(caption({...base,wind:.7})[0],/かばって/);
 assert.match(caption({...base,chapter:2,bridgeFrost:.8})[0],/かばって/);
 assert.match(caption({...base,event:{kind:'gust',at:12.5}})[0],/かばって/,'a coming gust outranks a temporary lull');
 assert.match(caption({...base,oxygen:20})[0],/息が危ない/);
});

test('the final storm and silence outrank a temporary calm wind',()=>{
 assert.match(caption({...base,finalePhase:'gust-warning'})[0],/最後の風.*長押し/);
 assert.match(caption({...base,finalePhase:'gust-active',wind:1.15})[0],/大突風/);
 assert.match(caption({...base,finalePhase:'silence',shield:true})[0],/いま離して/);
});

test('the final control names an open hand after release, including low breath and the window reply',()=>{
 assert.deepEqual(actionCopy({...base,finalePhase:'silence',shield:true}),['はなす','窓に灯りを見せる']);
 assert.deepEqual(actionCopy({...base,finalePhase:'silence',shield:false}),['手をひらいている','そのまま窓の返事を待つ']);
 assert.deepEqual(actionCopy({...base,finalePhase:'window-reply',shield:false,oxygen:18}),['手をひらいている','そのまま息を戻す']);
 assert.deepEqual(actionCopy({...base,finalePhase:'gust-active',shield:false}),['押さえる','灯りを守る']);
});
