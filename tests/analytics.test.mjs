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
test('Kienaide journey funnel uses one-based chapters and excludes unstarted or other-game stages',()=>{
 const {window}=boot();
 const send=(name,payload)=>window.emotionTrack(name,{game_id:'kienaide',...payload});
 send('chapter_reached',{chapter:2});
 send('finale_warning',{});
 window.emotionTrack('chapter_reached',{game_id:'chahan',chapter:2});
 send('game_start',{});
 send('chapter_reached',{chapter:2,email:'private@example.com'});
 send('chapter_reached',{chapter:8});
 send('finale_warning',{});
 send('finale_gust',{});
 send('finale_silence',{flame:12,oxygen:2});
 send('journey_exit',{destination:'private'});
 send('journey_exit',{destination:'home',elapsed:42});
 send('game_complete',{ending_id:'smother',chapter:1});
 send('finale_gust',{});
 const events=Array.from(window.dataLayer,args=>Array.from(args)).filter(args=>args[0]==='event');
 assert.deepEqual(events.map(args=>args[1]),['game_start','chapter_reached','finale_warning','finale_gust','finale_silence','journey_exit','game_complete']);
 assert.deepEqual({...events[1][2]},{game_id:'kienaide',chapter:'2'});
 assert.deepEqual({...events[4][2]},{game_id:'kienaide'});
 assert.deepEqual({...events[5][2]},{game_id:'kienaide',destination:'home'});
 assert.equal(events[6][2].chapter,'2');
 assert.ok(!JSON.stringify(events).includes('private@example.com'));
});
test('Kienaide choice and missed memory events preserve only controlled values',()=>{
 const {window}=boot();
 const send=(name,payload)=>window.emotionTrack(name,{game_id:'kienaide',...payload});
 send('decision_selected',{kind:'hearth',choice:'feed'});
 send('memory_missed',{memory_id:'scarf',count:0});
 send('game_start',{});
 window.emotionTrack('decision_selected',{game_id:'chahan',kind:'hearth',choice:'feed'});
 send('decision_selected',{kind:'hearth',choice:'spark'});
 send('decision_selected',{kind:'__proto__',choice:'feed'});
 send('decision_selected',{kind:'bridge',choice:'shelter',flame:82,oxygen:15,email:'private@example.com'});
 send('memory_missed',{memory_id:'private@example.com',count:0});
 send('memory_missed',{memory_id:'table',count:99});
 send('memory_missed',{memory_id:'promise',count:2,notes:'private note'});
 const events=Array.from(window.dataLayer,args=>Array.from(args)).filter(args=>args[0]==='event');
 assert.deepEqual(events.map(args=>args[1]),['game_start','decision_selected','memory_missed']);
 assert.deepEqual({...events[1][2]},{game_id:'kienaide',kind:'bridge',choice:'shelter'});
 assert.deepEqual({...events[2][2]},{game_id:'kienaide',memory_id:'promise',count:2});
 assert.ok(!JSON.stringify(events).includes('private@example.com'));
 assert.ok(!JSON.stringify(events).includes('private note'));
});
