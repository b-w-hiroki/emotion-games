import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGustStudy} from '../scripts/analyze-gust-study.mjs';
const trial=(period=1,attempt=1,variant='A',answers={})=>({period,attempt,variant,completed:false,first_input_ms:null,answers});
const data=(participant='p1',sequence='AB',runs=[trial()])=>({schema:1,participant,sequence,runs});
test('first trial excludes repeated and crossover experience',()=>{
 const s=analyzeGustStudy([data('p1','AB',[trial(),trial(1,2),trial(2,1,'B')]),data('p2','BA',[trial(1,1,'B')])]);
 assert.equal(s.participants,2);assert.equal(s.trials,4);assert.equal(s.groups.length,4);
 assert.equal(s.groups.filter(g=>g.cohort==='primary-first-trial').reduce((n,g)=>n+g.started,0),2);
 assert.equal(s.groups[0].incomplete,1);assert.equal(s.groups[0].firstInputMs.mean,null);assert.equal(s.groups[0].fair.mean,null);
});
test('missing and invalid ratings never become zero',()=>{
 const s=analyzeGustStudy([data('p1','AB',[{...trial(1,1,'A',{fair:'5',fun:'',line:'必要な長押し時間'}),completed:true,first_input_ms:0}])]);
 assert.equal(s.groups[0].fair.mean,5);assert.equal(s.groups[0].fun.missing,1);assert.equal(s.groups[0].firstInputMs.mean,0);assert.equal(s.groups[0].line.answered,1);
});
test('duplicate exports, malformed identity/assignment and duplicate trials fail closed',()=>{
 assert.throws(()=>analyzeGustStudy([data(),data()]),/Duplicate participant/);
 assert.throws(()=>analyzeGustStudy([data('p','AB',[trial(),trial()])]),/Duplicate trial/);
 assert.throws(()=>analyzeGustStudy([data('p','AB',[trial(1,1,'B')])]),/Invalid period/);
 assert.throws(()=>analyzeGustStudy([{records:[]}]),/Invalid comparison/);
 assert.throws(()=>analyzeGustStudy([data('p','AB',[{...trial(),first_input_ms:-1}])]),/latency/);
});
test('empty exports and incomplete plays remain honest',()=>{
 const s=analyzeGustStudy([data('p','AB',[])]);assert.equal(s.trials,0);assert.deepEqual(s.groups,[]);
 assert.equal(analyzeGustStudy([]).participants,0);
});
