import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/analytics.js','utf8');
function boot({id='G-TEST123',consent='yes',url='https://play.birdman-studio.com/kienaide/'}={}){
 const appended=[];
 const document={currentScript:{dataset:{measurementId:id}},readyState:'loading',head:{appendChild:node=>appended.push(node)},addEventListener(){},createElement:tag=>({tagName:tag})};
 const window={};
 const localStorage={getItem:()=>consent,setItem(){}};
 const context={document,window,localStorage,location:{href:url},URL,performance:{now:()=>1250}};
 vm.runInNewContext(source,context);
 return {window,appended};
}
test('missing GA ID and study/QA URLs never load the Google tag',()=>{
 for(const options of [{id:''},{url:'https://play.birdman-studio.com/kienaide/?study=1'},{url:'https://play.birdman-studio.com/kienaide/?qa=1'}]){
  const {window,appended}=boot(options);
  assert.equal(window.emotionTrack,undefined);
  assert.equal(appended.length,0);
 }
});
test('GA4 sends only allowed game KPIs after consent, with per-game duration',()=>{
 const {window,appended}=boot();
 assert.equal(appended.length,1);
 assert.match(appended[0].src,/googletagmanager\.com\/gtag\/js\?id=G-TEST123/);
 window.emotionTrack('game_start',{game_id:'kienaide',email:'private@example.com'});
 window.emotionTrack('game_complete',{game_id:'kienaide',ending_id:'dawn',found_count:3,memories:2,miracle:true,route:'rest',score:88,email:'private@example.com',felt:'安心'});
 window.emotionTrack('unapproved_event',{game_id:'kienaide'});
 const commands=Array.from(window.dataLayer,args=>Array.from(args));
 assert.deepEqual(commands.slice(0,2).map(x=>x[0]),['js','config']);
 assert.equal(commands[1][2].send_page_view,false);
 assert.deepEqual(commands.slice(2).map(x=>x[1]),['game_start','game_complete']);
 assert.deepEqual({...commands[3][2]},{game_id:'kienaide',ending_id:'dawn',found_count:3,memories:2,miracle:'yes',route:'rest',score:88,duration_ms:0});
 assert.ok(!JSON.stringify(commands).includes('private@example.com'));
 assert.ok(!JSON.stringify(commands).includes('felt'));
});
test('a declined visitor does not initialize Google or queue events',()=>{
 const {window,appended}=boot({consent:'no'});
 window.emotionTrack('game_start',{game_id:'kienaide'});
 assert.equal(window.dataLayer,undefined);
 assert.equal(appended.length,0);
});
test('a completion without a consented start is not counted',()=>{
 const {window}=boot();
 window.emotionTrack('game_complete',{game_id:'kienaide',ending_id:'dawn'});
 window.emotionTrack('ending_discovered',{game_id:'kienaide',ending_id:'dawn',found_count:1});
 assert.equal(window.dataLayer.filter(x=>x[0]==='event').length,0);
});
test('Kienaide finale sends shield and release seconds on reply and result without private state',()=>{
 const {window}=boot();
 window.emotionTrack('game_start',{game_id:'kienaide'});
 window.emotionTrack('finale_window',{game_id:'kienaide',level:'bright',gust_shield:2.7,silence_release:0.8,flame:82,oxygen:43});
 window.emotionTrack('game_complete',{game_id:'kienaide',ending_id:'dawn',gust_shield:2.7,silence_release:0.8});
 const events=Array.from(window.dataLayer,args=>Array.from(args)).filter(args=>args[0]==='event');
 assert.deepEqual({...events[1][2]},{game_id:'kienaide',level:'bright',gust_shield:2.7,silence_release:0.8});
 assert.deepEqual({...events[2][2]},{game_id:'kienaide',ending_id:'dawn',gust_shield:2.7,silence_release:0.8,duration_ms:0});
});
