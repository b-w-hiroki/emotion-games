import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/gust-study.js','utf8');
function load(search,stored=null,random=0,broken=false){
 const values=new Map(stored?[['kienaide-gust-study-v1',JSON.stringify(stored)]]:[]),window={};
 const ctx={window,URL,location:{href:'https://preview.test/kienaide/'+search},document:{addEventListener(){}},sessionStorage:{getItem:k=>values.get(k),setItem(k,v){if(broken)throw Error();values.set(k,v)}},crypto:{getRandomValues:a=>{a[0]=random;return a},randomUUID:()=> 'anonymous-test'}};
 vm.runInNewContext(source,ctx);return {window,data:JSON.parse(values.get('kienaide-gust-study-v1')||'null')};
}
test('only exact human-study entry accepts; QA overrides fail closed',()=>{
 for(const q of ['', '?qa=1','?study=1&qa=1','?study=1&t=7','?study=1&gustCue=anticipation'])assert.equal(load(q).window.KienaideGustStudyBlocked,true);
 assert.equal(load('?study=1','',0,true).window.KienaideGustStudyBlocked,true);
});
test('anonymous allocation persists and crossover reverses without rerandomization',()=>{
 for(const random of [0,1]){const a=load('?study=1',null,random);assert.equal(a.data.period,1);assert.equal(load('?study=1',a.data,1-random).window.KienaideGustStudy.variant,a.window.KienaideGustStudy.variant);a.data.period=2;assert.notEqual(load('?study=1',a.data).window.KienaideGustStudy.variant,a.window.KienaideGustStudy.variant)}
});
test('production build excludes preview bootstrap and core stays unchanged',()=>{
 const build=fs.readFileSync('scripts/build.mjs','utf8');assert.match(build,/if\(process.env.KIENAIDE_GUST_STUDY==='1'\)/);
 const app=fs.readFileSync('assets/app.js','utf8');assert.match(app,/qaSpeed:gustStudy\?1:/);assert.match(app,/seed=gustStudy\?5:/);
});
