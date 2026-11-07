import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function analyzeGustStudy(exports) {
 const participants=new Set(),groups=new Map();let total=0;
 for(const data of exports){
  if(data?.schema!==1||typeof data.participant!=='string'||!data.participant||!['AB','BA'].includes(data.sequence)||!Array.isArray(data.runs)) throw Error('Invalid comparison export; use the comparison JSON, not ordinary study JSON');
  if(participants.has(data.participant)) throw Error('Duplicate participant export: retain only the latest export for each participant');
  participants.add(data.participant);const keys=new Set();
  for(const r of data.runs){
   if(![1,2].includes(r.period)||!Number.isInteger(r.attempt)||r.attempt<1||r.variant!==data.sequence[r.period-1]||typeof r.completed!=='boolean') throw Error('Invalid period, attempt, variant or completion flag');
   const key=`${r.period}:${r.attempt}`;if(keys.has(key))throw Error('Duplicate trial within participant');keys.add(key);
   if(r.first_input_ms!==null&&(!Number.isFinite(r.first_input_ms)||r.first_input_ms<0))throw Error('Invalid input latency');
   const cohort=r.period===1&&r.attempt===1?'primary-first-trial':'exploratory';
   const groupKey=`${cohort}/${data.sequence}/period${r.period}/${r.variant}`;
   if(!groups.has(groupKey))groups.set(groupKey,{cohort,sequence:data.sequence,period:r.period,variant:r.variant,rows:[]});
   groups.get(groupKey).rows.push(r);total++;
  }
 }
 const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 const counts=(rows,key)=>{
  const values={},missing=rows.filter(r=>typeof r.answers?.[key]!=='string'||!r.answers[key]).length;
  for(const r of rows){const v=r.answers?.[key];if(typeof v==='string'&&v)values[v]=(values[v]||0)+1;}
  return {answered:rows.length-missing,missing,values};
 };
 return {schema:1,participants:participants.size,trials:total,groups:[...groups.values()].map(g=>{
  const rows=g.rows,latencies=rows.map(r=>r.first_input_ms).filter(Number.isFinite);
  const ratings=key=>{const values=rows.map(r=>r.answers?.[key]).filter(v=>typeof v==='string'&&/^[1-5]$/.test(v)).map(Number);return {n:values.length,missing:rows.length-values.length,mean:mean(values)};};
  return {cohort:g.cohort,sequence:g.sequence,period:g.period,variant:g.variant,started:rows.length,completed:rows.filter(r=>r.completed).length,incomplete:rows.filter(r=>!r.completed).length,
   firstInputMs:{n:latencies.length,missing:rows.length-latencies.length,mean:mean(latencies)},line:counts(rows,'line'),prediction:counts(rows,'prediction'),fair:ratings('fair'),fun:ratings('fun')};
 }),limitations:['Descriptive only: no adoption decision or causal benefit is established.', 'Primary comparison uses period 1 attempt 1 only. Later trials are exploratory and remain separated by sequence and period.', 'Input latency includes interruptions; it is not proof of comprehension. A-line answers are not successful cue comprehension.', 'Completion is not enjoyment; retry attempts do not establish voluntary retry. Missing answers are not zero. Device balance and observer notes require separate review.']};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const paths=process.argv.slice(2);if(!paths.length)throw Error('Usage: node scripts/analyze-gust-study.mjs participant1.json [participant2.json ...]');
  console.log(JSON.stringify(analyzeGustStudy(paths.map(p=>JSON.parse(readFileSync(p,'utf8')))),null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
