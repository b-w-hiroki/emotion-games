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
console.log('Emotion Games / opt-in playtest');
console.log('※ Self-reported feelings are exploratory; do not interpret this as proof of causality.');
for(const [game,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
 const done=items.filter(x=>x.completed===true);
 const answers=done.filter(x=>x.answered&&x.felt);
 const avgInput=done.length?done.reduce((a,x)=>a+(Number(x.inputs)||0),0)/done.length:NaN;
 const avgSecs=done.length?done.reduce((a,x)=>a+(Number(x.duration_ms)||0),0)/done.length/1000:NaN;
 const feelings={};
 for(const a of answers)feelings[a.felt]=(feelings[a.felt]||0)+1;
 console.log('\n'+game+' | starts='+items.length+' completed='+done.length+' ('+fmt(done.length/items.length*100)+'%) | answered='+answers.length+'/'+done.length);
 console.log('  mean duration='+fmt(avgSecs)+'s / mean inputs='+fmt(avgInput)+' / repeated starts: '+Math.max(0,items.length-1)+' (not unique people)');
 console.log('  feelings:',Object.entries(feelings).sort((a,b)=>b[1]-a[1]).map(([feel,n])=>feel+' '+n).join('、')||'No responses');
}
