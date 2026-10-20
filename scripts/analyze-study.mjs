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
const ratio=(n,total)=>total?fmt(n/total*100)+'%':'—';
const counts=(items,key)=>{const result={};for(const item of items)if(item[key]!==null&&item[key]!==undefined&&item[key]!=='')result[item[key]]=(result[item[key]]||0)+1;return result};
const listCounts=value=>Object.entries(value).sort((a,b)=>b[1]-a[1]).map(([key,n])=>key+' '+n).join('、')||'No responses';
console.log('Emotion Games / opt-in playtest');
console.log('※ Self-reported feelings are exploratory; do not interpret this as proof of causality.');
for(const [game,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
 const done=items.filter(x=>x.completed===true);
 const feelings=done.filter(x=>x.felt);
 const full=done.filter(x=>x.felt&&x.understood&&Number.isFinite(Number(x.intensity))&&x.replay_reason);
 const understood=done.filter(x=>x.understood);
 const intensity=done.map(x=>Number(x.intensity)).filter(x=>Number.isFinite(x)&&x>=1&&x<=5);
 const retries=items.filter(x=>Number(x.attempt_index)>1).length;
 const avgInput=done.length?done.reduce((a,x)=>a+(Number(x.inputs)||0),0)/done.length:NaN;
 const avgSecs=done.length?done.reduce((a,x)=>a+(Number(x.duration_ms)||0),0)/done.length/1000:NaN;
 console.log('\n'+game+' | starts='+items.length+' completed='+done.length+' ('+ratio(done.length,items.length)+') | full survey='+full.length+'/'+done.length);
 console.log('  mean duration='+fmt(avgSecs)+'s / mean inputs='+fmt(avgInput)+' / retry attempts='+retries);
 console.log('  feelings: '+listCounts(counts(feelings,'felt')));
 console.log('  comprehension: '+listCounts(counts(understood,'understood'))+' / immediate='+ratio(understood.filter(x=>x.understood==='immediate').length,understood.length));
 console.log('  emotion intensity: mean '+fmt(intensity.length?intensity.reduce((a,n)=>a+n,0)/intensity.length:NaN)+'/5 (n='+intensity.length+')');
 console.log('  replay intent: '+listCounts(counts(done,'replay_reason')));
 console.log('  endings: '+listCounts(counts(done,'ending_id')));
 if(game==='kienaide'){
  const mechanic=done.filter(x=>Number.isFinite(Number(x.memories)));
  const flames=done.map(x=>Number(x.lowest_flame)).filter(Number.isFinite);
  console.log('  flagship loop: mean memories='+fmt(mechanic.length?mechanic.reduce((a,x)=>a+Number(x.memories),0)/mechanic.length:NaN)+'/3 / miracle='+ratio(mechanic.filter(x=>x.miracle===true).length,mechanic.length)+' / mean lowest flame='+fmt(flames.length?flames.reduce((a,n)=>a+n,0)/flames.length:NaN));
  for(const route of ['shortcut','rest']){
   const chosen=items.filter(x=>x.route===route),finished=chosen.filter(x=>x.completed===true);
   console.log('  '+route+': choices='+chosen.length+' completed='+finished.length+' ('+ratio(finished.length,chosen.length)+') / endings: '+listCounts(counts(finished,'ending_id'))+' / miracle='+ratio(finished.filter(x=>x.miracle===true).length,finished.length));
  }
  console.log('  route unrecorded='+items.filter(x=>x.route!=='shortcut'&&x.route!=='rest').length+' (includes pre-choice exits and older exports)');
 }
}
