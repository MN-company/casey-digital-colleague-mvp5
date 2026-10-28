import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const kiosk=fs.readFileSync(new URL('../definitivo-kiosk.js',import.meta.url),'utf8');
function handoffFixture(){let stopped=0,poll,idle=0;const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){}});return nodes.get(id);};const ctx={CaseyLanguage:{get:()=> 'it-IT'},URL,location:{href:'https://example.org/index.html'},S:'COLLEGE',revision:0,link:null,phoneUrl:'',poll:null,expiry:null,clearLink:async()=>{},stopPoll(){},document:{getElementById:el},messages:{snapshot:()=>[],clear(){}},engine:'s',sessionPromise:null,qrcode:()=>({addData(){},make(){},getModuleCount:()=>1,isDark:()=>true}),t:()=>({thinking:'Thinking',transfer:'Continue on phone'}),A:{call:async a=>a==='issue'?{id:'link',token:'opaque-token',expires_in:30}:{consumed:true}},window:{CaseyVoiceSession:{stop:async()=>{stopped++;}}},say(){},status(){},goIdle(){idle++;},setInterval:f=>(poll=f,1),setTimeout:()=>1,Date};vm.createContext(ctx);const start=kiosk.indexOf(' async function handover()'),end=kiosk.indexOf('\n window.handover=');vm.runInContext(kiosk.slice(start,end)+'\nthis.handover=handover',ctx);return {ctx,get stopped(){return stopped;},poll:()=>poll(),get idle(){return idle;}};}
test('Showing QR keeps Live session; only consuming transfer stops kiosk voice',async()=>{const f=handoffFixture();const result=await f.ctx.handover();assert.equal(result.status,'handoff_ready');assert.equal(f.stopped,0);await f.poll();assert.equal(f.stopped,1);assert.equal(f.idle,1);});
test('QR visual announcement does not invoke browser speech while Live is active',()=>{let browserSpeech=0,legacyAnimation=0;const start=kiosk.indexOf(' window.say='),end=kiosk.indexOf('\n async function handover');const ctx={muted:false,window:{CaseyLive:{active:true}},showSilent(){},visualSay:()=>{legacyAnimation++;if(!ctx.muted)browserSpeech++;},clearInterval(){},capTimer:0,document:{getElementById:()=>({textContent:''})}};vm.createContext(ctx);vm.runInContext(kiosk.slice(start,end),ctx);ctx.window.say('Scan the QR');assert.equal(browserSpeech,0);assert.equal(legacyAnimation,0);assert.equal(ctx.muted,false);});
function avatarFixture(scenario='COLLEGE'){
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),nodes=new Map();
 const el=id=>{if(!nodes.has(id)){const classes=new Set(['hide']);nodes.set(id,{id,style:{},className:'',textContent:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},load(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}});}return nodes.get(id);};
 const events={},ctx={S:scenario,document:{getElementById:el},window:{addEventListener:(n,f)=>events[n]=f}};vm.createContext(ctx);
 vm.runInContext(html.slice(html.indexOf('const CASEY='),html.indexOf('/* ---------------- sottotitoli'))+'\nwindow.setState=setState;',ctx);
 vm.runInContext(fs.readFileSync(new URL('../kiosk-avatar.js',import.meta.url),'utf8'),ctx);
 const loaded=id=>{el(id).onloadeddata();return el(id);};
 return {ctx,events,el,loaded};
}
for(const scenario of ['COLLEGE','FARM'])test(`${scenario}: actual A/B and C/D playlists rotate at video end and across short replies`,()=>{
 const f=avatarFixture(scenario),dir=scenario==='COLLEGE'?'Casey - H-FARM College/':'Casey - H-FARM/';
 f.events['casey:live-state']({detail:{state:'idle'}});assert.equal(f.el('vB').src,dir+'A.mp4');f.loaded('vB');
 assert.equal(f.el('vB').loop,false);f.el('vB').onended();assert.equal(f.el('vA').src,dir+'B.mp4');f.loaded('vA');assert.equal(f.el('vB').paused,true);
 f.events['casey:live-state']({detail:{state:'responding'}});assert.equal(f.el('vB').src,dir+'C.mp4');f.loaded('vB');
 f.el('vB').onended();assert.equal(f.el('vA').src,dir+'D.mp4');f.loaded('vA');assert.equal(f.el('vB').classList.contains('hide'),true);
 f.el('vA').onended();assert.equal(f.el('vB').src,dir+'C.mp4');f.loaded('vB');
 f.events['casey:live-state']({detail:{state:'idle'}});f.loaded('vA');
 f.events['casey:live-state']({detail:{state:'responding'}});assert.equal(f.el('vB').src,dir+'D.mp4');
});
test('Scenario change discards a pending old-color frame and uses the new color playlist',()=>{
 const f=avatarFixture();f.events['casey:live-state']({detail:{state:'responding'}});const stale=f.el('vB').onloadeddata;
 f.ctx.S='FARM';f.events['casey:live-state']({detail:{state:'responding'}});stale();assert.equal(f.el('vB').classList.contains('hide'),true);
 assert.equal(f.el('vB').src,'Casey - H-FARM/C.mp4');f.loaded('vB');assert.equal(f.el('vB').classList.contains('hide'),false);
});
test('Broken playlist assets stop after bounded attempts instead of spinning or showing stale video',()=>{
 const f=avatarFixture();f.events['casey:live-state']({detail:{state:'idle'}});f.el('vB').onerror();assert.match(f.el('vB').src,/B.mp4$/);f.el('vB').onerror();
 assert.equal(f.el('avatar').style.opacity,1);assert.equal(f.el('vB').classList.contains('hide'),true);
});
