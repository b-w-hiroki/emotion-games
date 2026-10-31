import fs from 'node:fs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/analyze-study.mjs path/to/emotion-games-study.json');process.exit(1)}
let data;try{data=JSON.parse(fs.readFileSync(path,'utf8'))}catch(e){console.error('Cannot read study JSON:',e.message);process.exit(1)}
const records=Array.isArray(data.records)?data.records:[];if(!records.length){console.log('No playtest records in this file.');process.exit(0)}
const groups=new Map();
for(const r of records){
 if(typeof r.game_id!=='string')continue;
 const list=groups.get(r.game_id)||[];list.push(r);groups.set(r.game_id,list);
}
const fmt=n=>Number.isFinite(n)?n.toFixed(1):'—';
const numeric=value=>typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;
const ratio=(n,total)=>total?fmt(n/total*100)+'%':'—';
const counts=(items,key)=>{const result={};for(const item of items)if(item[key]!==null&&item[key]!==undefined&&item[key]!=='')result[item[key]]=(result[item[key]]||0)+1;return result};
const listCounts=value=>Object.entries(value).sort((a,b)=>b[1]-a[1]).map(([key,n])=>key+' '+n).join('、')||'No responses';
console.log('Emotion Games / opt-in playtest');
console.log('※ Self-reported feelings are exploratory; do not interpret this as proof of causality.');
for(const [game,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
 const done=items.filter(x=>x.completed===true);
 const feelings=done.filter(x=>x.felt);
 const full=done.filter(x=>x.felt&&x.understood&&numeric(x.intensity)>=1&&numeric(x.intensity)<=5&&x.replay_reason);
 const understood=done.filter(x=>x.understood);
 const intensity=done.map(x=>numeric(x.intensity)).filter(x=>Number.isFinite(x)&&x>=1&&x<=5);
 const retries=items.filter(x=>Number(x.attempt_index)>1).length;
 const mean=values=>values.length?values.reduce((a,n)=>a+n,0)/values.length:NaN;
 const inputs=done.map(x=>numeric(x.inputs)).filter(n=>Number.isFinite(n)&&n>=0);
 const durations=done.map(x=>numeric(x.duration_ms)).filter(n=>Number.isFinite(n)&&n>=0);
 const avgInput=mean(inputs),avgSecs=mean(durations)/1000;
 console.log('\n'+game+' | starts='+items.length+' completed='+done.length+' ('+ratio(done.length,items.length)+') | full survey='+full.length+'/'+done.length);
 console.log('  mean duration='+fmt(avgSecs)+'s / mean inputs='+fmt(avgInput)+' / retry attempts='+retries);
 console.log('  feelings: '+listCounts(counts(feelings,'felt')));
 console.log('  comprehension: '+listCounts(counts(understood,'understood'))+' / immediate='+ratio(understood.filter(x=>x.understood==='immediate').length,understood.length));
 console.log('  emotion intensity: mean '+fmt(intensity.length?intensity.reduce((a,n)=>a+n,0)/intensity.length:NaN)+'/5 (n='+intensity.length+')');
 console.log('  replay intent: '+listCounts(counts(done,'replay_reason')));
 console.log('  endings: '+listCounts(counts(done,'ending_id')));
 if(game==='kienaide'){
  const memories=done.map(x=>numeric(x.memories)).filter(n=>Number.isFinite(n)&&n>=0&&n<=3);
  const miracles=done.filter(x=>typeof x.miracle==='boolean');
  const flames=done.map(x=>numeric(x.lowest_flame)).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
  console.log('  flagship loop: mean memories='+fmt(mean(memories))+'/3 / miracle='+ratio(miracles.filter(x=>x.miracle).length,miracles.length)+' / mean lowest flame='+fmt(mean(flames)));
  const observed=items.filter(x=>x.journey_detail&&Array.isArray(x.journey_detail.decisions)&&Array.isArray(x.journey_detail.collected)&&Array.isArray(x.journey_detail.missed));
  if(observed.length){
   const details=observed.map(x=>x.journey_detail),tally=id=>details.filter(x=>x[id]===true).length;
   const memoryTally=key=>['scarf','table','promise'].map(id=>id+' '+details.filter(x=>x[key].includes(id)).length).join('、');
   const choices=kind=>listCounts(counts(details.flatMap(x=>x.decisions).filter(x=>x.kind===kind),'choice'));
   const windows=details.map(x=>x.window).filter(x=>x&&['bright','faint','dark'].includes(x.level));
   const meanWindow=key=>{const values=windows.map(x=>x[key]).filter(Number.isFinite);return fmt(values.length?values.reduce((a,n)=>a+n,0)/values.length:NaN)};
   console.log('  journey observations: '+observed.length+'/'+items.length+' attempts (older exports excluded)');
   console.log('  decisions: hearth '+choices('hearth')+' / bridge '+choices('bridge'));
   console.log('  memory collected: '+memoryTally('collected')+' / missed: '+memoryTally('missed'));
   console.log('  relationship moments: companion '+tally('companion')+' / shelter '+tally('shelter')+' / miracle '+tally('miracle'));
   console.log('  window reply: '+listCounts(counts(windows,'level'))+' / mean gust shield='+meanWindow('gust_shield')+'s / mean silence release='+meanWindow('silence_release')+'s');
  }
  for(const route of ['shortcut','rest']){
   const chosen=items.filter(x=>x.route===route),finished=chosen.filter(x=>x.completed===true);
   const routeMiracles=finished.filter(x=>typeof x.miracle==='boolean');
   console.log('  '+route+': choices='+chosen.length+' completed='+finished.length+' ('+ratio(finished.length,chosen.length)+') / endings: '+listCounts(counts(finished,'ending_id'))+' / miracle='+ratio(routeMiracles.filter(x=>x.miracle).length,routeMiracles.length));
  }
  console.log('  route unrecorded='+items.filter(x=>x.route!=='shortcut'&&x.route!=='rest').length+' (includes pre-choice exits and older exports)');
 }
}
