import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const memory=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const result=(transcript,isFinal)=>Object.assign([{transcript}],{isFinal});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
// Loads the real definitivo-kiosk.js (stubbed HandoffAPI/qrcode/index.html globals), then demo-script.js and demo-mode.js.
// The vm global object doubles as `window`, as in the browser.
function fixture({search='?demo=1',storage=memory(),audioFails=false,issue=null,startThrows=0,href='http://localhost:3000/index.html',scenario='COLLEGE'}={}){
 const nodes=new Map(),timers=new Map(),intervals=new Map(),delays=[],keys=[],docEvents={},winEvents={},audios=[],recs=[],said=[],avatar=[],states=[],dialogue=[],fetches=[],api=[],qr=[];
 let tid=0,idles=0,resets=0,issued=0,throwsLeft=startThrows;const scenarios=[],silent=[],events=[],created=[];
 const el=id=>{if(!nodes.has(id)){const c=new Set();nodes.set(id,{id,textContent:'',value:'',placeholder:'',hidden:false,title:'',innerHTML:'',dataset:{},classList:{add:x=>c.add(x),remove:x=>c.delete(x),toggle:(x,on)=>on?c.add(x):c.delete(x),contains:x=>c.has(x)},setAttribute(){},getAttribute:()=>'',replaceChildren(){}});}return nodes.get(id);};
 const document={visibilityState:'visible',getElementById:el,querySelector:()=>el('bePill'),querySelectorAll:sel=>sel.split(',').map(s=>s.trim()).filter(s=>/^#[\w-]+$/.test(s)).map(s=>el(s.slice(1))),addEventListener:(n,f)=>{if(n==='keydown')keys.push(f);(docEvents[n]||=[]).push(f);}};
 class Audio{constructor(src){this.src=src;this.currentTime=0;created.push(this);}load(){this.loaded=true;}play(){this.playing=true;audios.push(this);return audioFails?Promise.reject(Error('missing')):Promise.resolve();}pause(){this.playing=false;}fire(n){this['on'+n]?.();}}
 class SR{constructor(){recs.push(this);}start(){if(throwsLeft>0){throwsLeft--;throw Error('InvalidStateError');}this.started=true;}stop(){this.stopped=true;}abort(){this.aborted=true;}}
 const messages=[];
 const HandoffAPI={call:async(action,body)=>{api.push([action,body]);if(action==='issue'){if(issue)return issue(body);issued++;return {id:'link-'+issued,token:'opaque-'+issued,expires_in:600};}if(action==='status')return {consumed:false,expired:false};if(action==='cancel')return {ok:true};throw Error('unexpected action '+action);}};
 const ctx={document,location:{search,origin:'https://demo.example',href},URL,URLSearchParams,sessionStorage:storage,Audio,SpeechRecognition:SR,Date,
  CASEY_CONFIG:Object.freeze({environment:'test',apiUrl:'https://example.invalid/functions/v1/casey-definitivo-ui',publishableKey:'public-test'}),
  HandoffAPI,CaseyLanguage:{get:()=> 'it-IT'},S:scenario,capTimer:0,
  CaseyDialogue:{append:(r,t)=>{dialogue.push([r,t]);messages.push({role:r,text:t});},snapshot:()=>messages.slice(),clear:()=>{messages.length=0;},replace(){}},
  qrcode:()=>({addData:u=>qr.push(u),make(){},getModuleCount:()=>1,isDark:()=>true}),
  say:(t,_src,_kind,_label,end)=>said.push({text:t,end}),showSilent:t=>silent.push(t),shutUp(){},setState:(...a)=>states.push(a),setAvatarState:k=>avatar.push(k),
  goIdle:()=>{idles++;},resetAll:()=>{resets++;},setScenario:s=>scenarios.push(s),
  addEventListener:(n,f)=>{(winEvents[n]||=[]).push(f);},dispatchEvent:e=>{events.push(e.type);for(const f of winEvents[e.type]||[])f(e);return true;},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  fetch:async url=>{fetches.push(String(url));throw Error('no network in tests');},
  setTimeout:(f,ms)=>{const id=++tid;timers.set(id,f);delays.push(ms);return id;},clearTimeout:id=>timers.delete(id),
  setInterval:f=>{const id=++tid;intervals.set(id,f);return id;},clearInterval:id=>intervals.delete(id)};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('definitivo-kiosk.js'),ctx);
 const kioskSend=ctx.send,kioskMic=ctx.toggleMic;
 vm.runInContext(read('demo-script.js'),ctx);vm.runInContext(read('demo-mode.js'),ctx);
 const run=async(max=60)=>{for(let n=0;n<max;n++){await new Promise(r=>setImmediate(r));if(!timers.size)return;const due=[...timers.values()];timers.clear();for(const f of due)f();}};
 const poll=async()=>{for(const f of [...intervals.values()])await f();await run();};
 const key=(code,extra={})=>{const e={code,key:code,target:{tagName:'BODY'},prevented:false,preventDefault(){e.prevented=true;},...extra};for(const f of keys)f(e);return e;};
 const fire=(target,n)=>{for(const f of (target==='doc'?docEvents:winEvents)[n]||[])f({});};
 const end=async()=>{audios.at(-1).fire('ended');await run();};
 return {window:ctx,created,storage,scenarios,silent,events,el,audios,recs,said,texts:()=>said.map(x=>x.text),avatar,states,dialogue,fetches,api,qr,delays,run,poll,key,fire,end,document,kioskSend,kioskMic,
  cancels:()=>api.filter(x=>x[0]==='cancel').map(x=>x[1].id),issues:()=>api.filter(x=>x[0]==='issue').length,
  get idles(){return idles;},get resets(){return resets;},script:ctx.CaseyDemoScript,qrOn:()=>el('qrCard').classList.contains('on')};
}
const at=n=>{const s=memory();s.setItem('casey-demo-step',String(n));return s;};

test('without ?demo=1 nothing is replaced and the kiosk QR URL is unchanged',async()=>{
 const f=fixture({search:''});assert.equal(f.window.send,f.kioskSend);assert.equal(f.window.toggleMic,f.kioskMic);assert.equal(f.window.CaseyDemo,undefined);assert.equal(f.window.CASEY_CONFIG.demoActive,undefined);assert.equal(f.el('settingsLink').hidden,false);
 const r=await f.window.handover(undefined,'badge');assert.equal(r.status,'handoff_ready');
 assert.equal(f.qr[0],'http://localhost:3000/app-blu.html?casey=1&lang=it-IT&intent=badge#handoff=opaque-1');
 assert.equal(f.said.at(-1).end,'hand','non-demo QR keeps the original hand gesture');
 assert.equal(f.window.caseyHandoffActive(),true);
});
test('demo mode flags config with the same-origin app base and hides totem sign-in entry points',()=>{const f=fixture();assert.equal(f.window.CaseyDemo.active,true);assert.equal(f.window.CASEY_CONFIG.demoActive,true);assert.equal(f.window.CASEY_CONFIG.demoAppBase,'https://demo.example/');assert.equal(f.window.CASEY_CONFIG.environment,'test');for(const id of ['settingsLink','appLink','tryCaseyLink'])assert.equal(f.el(id).hidden,true,id);});
test('without ?demo=1 no audio is preloaded and keys do nothing',async()=>{const f=fixture({search:''});assert.equal(f.created.length,0);f.key('Digit1');f.key('Escape');await f.run();assert.equal(f.audios.length,0);assert.deepEqual(f.dialogue,[]);});
test('send uses the expected step when keywords miss, with avatar E, audio, C then A',async()=>{const f=fixture();assert.notEqual(f.window.send,f.kioskSend);void f.window.send('qualsiasi');await f.run();const line=f.script.steps[0].totem[0];assert.deepEqual(f.texts(),[line.text]);assert.equal(f.said[0].end,undefined);assert.equal(f.audios.length,1);assert.equal(f.audios[0].src,line.audio);assert.equal(f.avatar[0],'E');assert.equal(f.avatar.at(-1),'C');await f.end();assert.equal(f.avatar.at(-1),'A');assert.equal(f.window.CaseyDemo.step(),1);assert.deepEqual(f.dialogue.map(x=>x[0]),['user','assistant']);assert.equal(f.dialogue[0][1],'qualsiasi');assert.equal(f.issues(),0);});
test('case selection: highest keyword score wins, a tie falls back to the expected step',async()=>{
 const f=fixture();void f.window.send('vorrei prenotare un incontro con il career service');await f.run();assert.equal(f.audios[0].src,'assets/demo-audio/caso4_career.mp3');assert.equal(f.dialogue[0][1],'vorrei prenotare un incontro con il career service');
 const g=fixture({storage:at(1)});void g.window.send('badge e stage');await g.run();assert.equal(g.audios[0].src,'assets/demo-audio/caso2_badge.mp3','tie -> expected step 2');
 const h=fixture({storage:at(1)});void h.window.send('stage part time tirocinio e badge');await h.run();assert.equal(h.audios[0].src,'assets/demo-audio/caso3_stage.mp3');
});
test('badge case issues one QR only after the audio ends, to the branch app with demo=1',async()=>{
 const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();assert.equal(f.issues(),0);await f.end();
 assert.equal(f.issues(),1);assert.equal(f.qr.length,1);const url=new URL(f.qr[0]);
 assert.ok(f.qr[0].startsWith('https://demo.example/app-blu.html?casey=1'));assert.equal(url.searchParams.get('demo'),'1');assert.equal(url.searchParams.get('intent'),'badge');assert.match(url.hash,/^#handoff=opaque-1$/);
 assert.equal(f.window.CaseyDemo.step(),2,'the sequence moves on once the QR is shown (presenter may not scan)');assert.equal(f.qrOn(),true);
 assert.equal(f.said.at(-1).end,undefined,'demo QR line schedules no late idle gesture');
});
test('stage and career QRs carry intent=internship and intent=career',async()=>{
 for(const [n,intent] of [[2,'internship'],[3,'career']]){const f=fixture({storage:at(n)});void f.window.send(f.script.steps[n].question);await f.run();await f.end();
  const url=new URL(f.qr[0]);assert.ok(f.qr[0].startsWith('https://demo.example/app-blu.html?casey=1'));assert.equal(url.searchParams.get('intent'),intent);assert.ok(url.hash.startsWith('#handoff='));}
});
test('keys 1-4 run each case like speech: scripted question as user message, audio, QR',async()=>{
 const ids=['caso1_checkin','caso2_badge','caso3_stage','caso4_career'];
 for(const [n,code] of [[0,'Digit1'],[1,'Digit2'],[2,'Numpad3'],[3,'Digit4']]){const f=fixture();const e=f.key(code);assert.equal(e.prevented,true);await f.run();
  assert.equal(f.dialogue[0][1],f.script.steps[n].question);assert.equal(f.audios[0].src,'assets/demo-audio/'+ids[n]+'.mp3');await f.end();assert.equal(f.issues(),n===0?0:1,code);}
});
test('keys are ignored while typing, with modifiers or on auto-repeat',async()=>{
 const f=fixture();for(const tagName of ['INPUT','TEXTAREA','SELECT'])f.key('Digit2',{target:{tagName}});f.key('Digit2',{target:{tagName:'DIV',isContentEditable:true}});f.key('Digit2',{ctrlKey:true});await f.run();assert.equal(f.audios.length,0);
 f.key('Digit1');await f.run();f.key('Digit2',{repeat:true});await f.run();assert.equal(f.audios.length,1);assert.equal(f.said.length,1);
 f.key('Escape');assert.equal(f.audios[0].playing,false,'stop always works');
});
test('key 3 during case 2 audio stops case 2 and runs case 3 with no double answer',async()=>{
 const f=fixture();f.key('Digit2');await f.run();const a2=f.audios[0];assert.equal(a2.src,'assets/demo-audio/caso2_badge.mp3');
 f.key('Digit3');await f.run();assert.equal(a2.playing,false);assert.equal(f.audios.at(-1).src,'assets/demo-audio/caso3_stage.mp3');
 a2.fire('ended');await f.run();assert.equal(f.issues(),0,'late ended of case 2 is a no-op');
 await f.end();assert.equal(f.issues(),1);assert.equal(new URL(f.qr.at(-1)).searchParams.get('intent'),'internship');
 for(const n of [1,2])assert.equal(f.texts().filter(t=>t===f.script.render(f.script.steps[n].totem[0].text)).length,1,'each case answers once');
});
test('a key during case audio cancels the QR still on screen from the previous case',async()=>{
 const f=fixture();f.key('Digit2');await f.run();await f.end();assert.equal(f.qrOn(),true);
 f.key('Digit3');await f.run();assert.deepEqual(f.cancels(),['link-1']);const a3=f.audios.at(-1);
 f.key('Digit4');await f.run();assert.equal(a3.playing,false);await f.end();assert.equal(f.issues(),2);assert.deepEqual(f.cancels(),['link-1']);
 assert.equal(new URL(f.qr.at(-1)).searchParams.get('intent'),'career');assert.equal(f.window.caseyHandoffActive(),true);
});
test('a key during a silent fallback timer interrupts it',async()=>{
 const f=fixture({audioFails:true});f.key('Digit1');await f.run(3);f.key('Digit4');await f.run();
 assert.deepEqual(f.dialogue.filter(x=>x[0]==='user').map(x=>x[1]),[f.script.steps[0].question,f.script.steps[3].question]);assert.equal(f.issues(),1);assert.equal(f.window.CaseyDemo.step(),4);
});
test('a key during a pending handover cancels the pending link and runs the new case',async()=>{
 const d=deferred();let n=0;const f=fixture({issue:()=>++n===1?d.promise:{id:'new',token:'new-token',expires_in:600}});
 f.key('Digit2');await f.run();await f.end();assert.equal(f.issues(),1);
 f.key('Digit3');await f.run();d.resolve({id:'late',token:'late-token',expires_in:600});await f.run();
 assert.deepEqual(f.cancels(),['late']);assert.equal(f.qr.length,0);await f.end();
 assert.equal(f.issues(),2);assert.equal(f.qr.length,1);assert.match(f.qr[0],/handoff=new-token$/);assert.equal(f.window.caseyHandoffActive(),true);assert.deepEqual(f.cancels(),['late']);
});
test('speech while Casey speaks is still ignored',async()=>{
 const f=fixture();f.window.toggleMic();f.recs[0].onresult({results:[result('ciao',true)]});await f.run(3);const recs=f.recs.length,said=f.said.length;
 f.recs.at(-1).onresult?.({results:[result('posso fare uno stage part-time?',true)]});await f.run(3);
 assert.equal(f.recs.length,recs,'no recognizer while speaking');assert.equal(f.said.length,said);assert.equal(f.audios.length,1);
});
test('after a demo send #q is blurred, and keys work when #q is focused but empty',async()=>{
 const f=fixture();const q=f.window.document.getElementById('q');let blurs=0;q.blur=()=>{blurs++;};q.id='q';q.tagName='INPUT';
 q.value='badge';void f.window.send();await f.run();assert.ok(blurs>=1,'blurred after send');await f.end();
 const n=f.audios.length;q.value='';f.key('Digit1',{target:q});await f.run();assert.equal(f.audios.length,n+1,'empty #q does not block keys');await f.end();
 q.value='sto scrivendo';f.key('Digit2',{target:q});await f.run();assert.equal(f.audios.length,n+1,'typing in #q still blocks keys');
});
test('ArrowRight and PageDown run the next case in sequence; old Shift bindings are gone',async()=>{
 const f=fixture();f.key('ArrowRight');await f.run();await f.end();assert.equal(f.window.CaseyDemo.step(),1);f.key('PageDown');await f.run();assert.equal(f.audios.at(-1).src,'assets/demo-audio/caso2_badge.mp3');await f.end();assert.equal(f.window.CaseyDemo.step(),2);
 const g=fixture({storage:at(1)});g.key('Backspace',{shiftKey:true});assert.equal(g.window.CaseyDemo.step(),1);
});
test('Escape, Digit0 and Numpad0 stop, reset to idle and cancel an active QR',async()=>{
 for(const code of ['Escape','Digit0','Numpad0']){const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();await f.end();assert.equal(f.window.caseyHandoffActive(),true);
  f.key(code);await f.run();assert.deepEqual(f.cancels(),['link-1']);assert.equal(f.resets,1);assert.equal(f.qrOn(),false);assert.equal(f.window.CaseyDemo.step(),0);assert.equal(f.window.CaseyDialogue.snapshot().length,0);}
 const g=fixture({storage:at(2)});void g.window.send('x');await g.run();g.key('Escape');assert.equal(g.audios[0].playing,false);assert.equal(g.window.CaseyDemo.step(),0);assert.equal(g.idles,1);g.audios[0].fire('ended');await g.run();assert.equal(g.issues(),0);
});
test('re-pressing the key of a QR case cancels the old link and shows a new QR',async()=>{
 const f=fixture();f.key('Digit2');await f.run();await f.end();assert.equal(f.issues(),1);
 f.key('Digit2');await f.run();assert.deepEqual(f.cancels(),['link-1']);assert.equal(f.dialogue.filter(x=>x[0]==='user').at(-1)[1],f.script.steps[1].question);assert.equal(f.dialogue.filter(x=>x[0]==='user').length,2);await f.end();
 assert.equal(f.issues(),2);assert.equal(f.window.caseyHandoffActive(),true);assert.match(f.qr.at(-1),/handoff=opaque-2$/);
 f.key('Digit3');await f.run();await f.end();assert.deepEqual(f.cancels(),['link-1','link-2']);assert.equal(new URL(f.qr.at(-1)).searchParams.get('intent'),'internship');
});
test('a late speech result after a key never produces a second answer',async()=>{
 const f=fixture();f.window.toggleMic();const r=f.recs[0];f.key('Digit1');await f.run();assert.equal(r.aborted,true);r.onresult?.({results:[result('badge',true)]});await f.run();
 assert.equal(f.said.length,1);assert.equal(f.audios.length,1);
});
test('during a QR, speech that names a case moves on; other speech keeps the QR',async()=>{
 const f=fixture({storage:at(1)});f.window.toggleMic();f.recs[0].onresult({results:[result('badge',true)]});await f.run();await f.end();
 assert.equal(f.window.caseyHandoffActive(),true);await f.run(3);const r=f.recs.at(-1);assert.equal(r.started,true,'still listening while the QR is shown');
 const said=f.said.length;r.onresult({results:[result('buongiorno a tutti',true)]});await f.run(3);assert.equal(f.said.length,said);assert.deepEqual(f.cancels(),[]);assert.equal(f.qrOn(),true);
 f.recs.at(-1).onresult({results:[result('posso fare uno stage part-time?',true)]});await f.run();assert.deepEqual(f.cancels(),['link-1']);assert.equal(f.audios.at(-1).src,'assets/demo-audio/caso3_stage.mp3');
});
test('handover failure keeps the step so the presenter can retry with the key',async()=>{
 let fail=true;const f=fixture({storage:at(1),issue:()=>{if(fail)throw Error('offline');return {id:'retry',token:'t2',expires_in:600};}});
 void f.window.send('badge');await f.run();await f.end();assert.equal(f.window.CaseyDemo.step(),1);assert.equal(f.qr.length,0);
 fail=false;f.key('Digit2');await f.run();await f.end();assert.equal(f.window.CaseyDemo.step(),2);assert.equal(f.qr.length,1);
});
test('stop() during a pending handover cancels the issued link and shows no QR',async()=>{
 const d=deferred();const f=fixture({storage:at(1),issue:()=>d.promise});void f.window.send('badge');await f.run();await f.end();
 assert.equal(f.issues(),1);f.window.CaseyDemo.stop();d.resolve({id:'late',token:'late-token',expires_in:600});await f.run();
 assert.deepEqual(f.cancels(),['late']);assert.equal(f.qr.length,0);assert.equal(f.qrOn(),false);assert.equal(f.window.caseyHandoffActive(),false);assert.equal(f.window.CaseyDemo.step(),1);
});
test('stop() during audio makes the late ended event a no-op and resets the avatar to idle',async()=>{const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();const audio=f.audios[0];f.window.CaseyDemo.stop();assert.equal(audio.playing,false);assert.equal(f.avatar.at(-1),'A');assert.deepEqual([...f.states.at(-1)],['idle','Pronto','']);const avatarCount=f.avatar.length;audio.fire('ended');await f.run();assert.equal(f.issues(),0);assert.equal(f.window.CaseyDemo.step(),1);assert.equal(f.avatar.length,avatarCount);assert.equal(f.said.length,1);});
test('pagehide and hidden visibility stop the demo',async()=>{
 const f=fixture();void f.window.send('x');await f.run();f.fire('win','pagehide');assert.equal(f.audios[0].playing,false);
 const g=fixture();g.window.toggleMic();const r=g.recs[0];g.document.visibilityState='hidden';g.fire('doc','visibilitychange');assert.equal(r.aborted,true);await g.run();assert.equal(g.recs.length,1);
 const h=fixture();h.window.toggleMic();h.fire('doc','visibilitychange');assert.equal(h.recs[0].aborted,undefined,'visible change is ignored');
});
test('missing audio keeps the text and continues after a silent talking delay',async()=>{const f=fixture({audioFails:true});void f.window.send('ciao');await f.run();assert.equal(f.said.length,1);assert.ok(f.avatar.includes('C'));assert.equal(f.avatar.at(-1),'A');assert.equal(f.window.CaseyDemo.step(),1);});
test('case audio and fallback are preloaded once and reused; readiness dot when all are ready',async()=>{
 const f=fixture();const srcs=f.created.map(a=>a.src);assert.deepEqual(srcs,['caso1_checkin','caso2_badge','caso3_stage','caso4_career','fallback'].map(id=>'assets/demo-audio/'+id+'.mp3'));
 assert.ok(f.created.every(a=>a.preload==='auto'&&a.loaded));assert.equal(f.window.CaseyDemo.audioReady(),false);
 f.created.slice(0,4).forEach(a=>a.fire('canplaythrough'));f.created[0].fire('canplaythrough');assert.equal(f.window.CaseyDemo.audioReady(),false);assert.notEqual(f.el('bePill').dataset?.demoAudio,'ready');
 f.created[4].fire('canplaythrough');assert.equal(f.window.CaseyDemo.audioReady(),true);assert.equal(f.el('bePill').dataset.demoAudio,'ready');
 void f.window.send('x');await f.run();assert.equal(f.audios[0],f.created[0],'playback reuses the preloaded element');assert.equal(f.created.length,5);
});
test('interim recognition updates #capText without advancing; final result advances',async()=>{const f=fixture();f.window.toggleMic();const r=f.recs[0];assert.equal(r.started,true);assert.equal(r.lang,'it-IT');assert.equal(r.interimResults,true);assert.equal(r.continuous,false);r.onresult({resultIndex:0,results:[result('come funz',false)]});assert.equal(f.el('capText').textContent,'come funz');assert.equal(f.said.length,0);assert.equal(f.audios.length,0);r.onresult({resultIndex:0,results:[result('come funziona il check-in',true)]});await f.run();assert.equal(f.said.length,1);assert.equal(f.dialogue[0][1],'come funziona il check-in');await f.end();assert.ok(f.recs.length>=2,'listens again after Casey finishes');assert.equal(f.recs.at(-1).started,true);});
test('a throwing recognizer start() is dropped and retried with backoff',async()=>{const f=fixture({startThrows:1});f.window.toggleMic();assert.equal(f.recs.length,1);assert.notEqual(f.recs[0].started,true);await f.run(3);assert.equal(f.recs.length,2);assert.equal(f.recs[1].started,true);});
test('consecutive recognizer errors back off and stop after five with a subtitle notice',async()=>{
 const f=fixture();f.window.toggleMic();const waits=[];
 for(let n=0;n<5;n++){const r=f.recs.at(-1);const before=f.delays.length;r.onerror({error:n%2?'network':'aborted'});r.onend();waits.push(...f.delays.slice(before));await f.run(3);}
 assert.equal(f.recs.length,5);assert.ok(waits.length===4&&waits.every((ms,i)=>!i||ms>waits[i-1]),'backoff grows: '+waits);
 assert.match(f.el('capText').textContent,/microfono/i);await f.run();assert.equal(f.recs.length,5);
 assert.equal(f.el('micBtn').classList.contains('on'),false);
});
test('a result resets the recognizer error count',async()=>{const f=fixture();f.window.toggleMic();for(let n=0;n<4;n++){const r=f.recs.at(-1);r.onerror({error:'network'});r.onend();await f.run(3);}const r=f.recs.at(-1);r.onresult({results:[result('cia',false)]});r.onerror({error:'network'});r.onend();await f.run(3);assert.equal(f.recs.length,6);});
test('no-speech silences never pause the microphone and restart after the normal delay',async()=>{
 const f=fixture();f.window.toggleMic();
 for(let n=0;n<10;n++){const r=f.recs.at(-1);const before=f.delays.length;r.onerror({error:'no-speech'});r.onend();assert.deepEqual(f.delays.slice(before),[350]);await f.run(3);}
 assert.equal(f.recs.length,11);assert.equal(f.recs.at(-1).started,true);
 assert.doesNotMatch(f.el('capText').textContent,/Microfono in pausa/);assert.equal(f.el('micBtn').classList.contains('on'),true);
});
test('step index survives goIdle and a reload through sessionStorage',async()=>{const storage=memory();const f=fixture({storage});void f.window.send('primo');await f.run();await f.end();f.window.goIdle();assert.equal(storage.getItem('casey-demo-step'),'1');const g=fixture({storage});assert.equal(g.window.CaseyDemo.step(),1);void g.window.send('secondo');await g.run();assert.equal(g.texts()[0],g.script.steps[1].totem[0].text);});
test('after the last step Casey repeats the fallback line unless a case is named',async()=>{const f=fixture({storage:at(4)});void f.window.send('ancora');await f.run();assert.equal(f.texts()[0],f.script.fallback.text);await f.end();assert.equal(f.window.CaseyDemo.step(),4);assert.equal(f.issues(),0);
 const g=fixture({storage:at(4)});void g.window.send('pronote');await g.run();assert.equal(g.texts()[0],g.script.steps[0].totem[0].text);});
test('a full non-handoff step makes no network call; QR steps only use issue',async()=>{
 const f=fixture();void f.window.send('domanda');await f.run();await f.end();assert.equal(f.window.CaseyDemo.step(),1);assert.deepEqual(f.fetches,[]);assert.deepEqual(f.api,[]);
 void f.window.send('badge');await f.run();await f.end();assert.deepEqual(f.fetches,[]);assert.deepEqual(f.api.map(x=>x[0]),['issue']);
});
const statusReply=reply=>async function(action,body){this.api.push([action,body]);if(action==='status'){if(reply instanceof Error)throw reply;return reply;}if(action==='cancel')return {ok:true};throw Error('unexpected '+action);};
test('Farm scenario in demo: QR always opens app-blu.html, Farm tab hidden and coerced to College',async()=>{
 const f=fixture({storage:at(1),scenario:'FARM'});assert.equal(f.el('sc-FARM').hidden,true);
 f.window.setScenario('FARM');assert.deepEqual(f.scenarios,['COLLEGE']);
 void f.window.send('badge');await f.run();await f.end();
 assert.ok(f.qr[0].startsWith('https://demo.example/app-blu.html?casey=1'),f.qr[0]);assert.equal(f.el('qrTitle').textContent,'Casey · College');
 const g=fixture({search:'',scenario:'FARM'});await g.window.handover();assert.ok(g.qr[0].startsWith('http://localhost:3000/app-rossa.html?casey=1'),'non-demo Farm unchanged');assert.equal(g.el('sc-FARM').hidden,false);g.window.setScenario('FARM');assert.deepEqual(g.scenarios,['FARM']);
});
test('demo makes the totem CaseyBridge inert: no classify, knowledge_lookup or QR',async()=>{
 const f=fixture();f.window.CaseyDialogue.append('user','vorrei prenotare');
 const h=await f.window.CaseyBridge.liveMobileHandoff();const k=await f.window.CaseyBridge.liveSearchKnowledge('regolamento');
 await f.run();assert.equal(h.status,'unavailable_in_demo');assert.equal(k.status,'unavailable_in_demo');assert.deepEqual(f.api,[]);assert.deepEqual(f.fetches,[]);assert.equal(f.qr.length,0);
 const g=fixture({search:''});g.window.CaseyDialogue.append('user','x');await g.window.CaseyBridge.liveMobileHandoff().catch(()=>{});assert.ok(g.api.some(x=>x[0]==='classify'),'non-demo bridge unchanged');
});
test('a consumed QR link clears the QR and keeps the advanced step',async()=>{
 const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();await f.end();assert.equal(f.window.CaseyDemo.step(),2);
 f.window.HandoffAPI.call=statusReply({consumed:true,expired:false}).bind(f);await f.poll();
 assert.ok(f.events.includes('casey:handoff-consumed'));assert.equal(f.window.CaseyDemo.step(),2);assert.equal(f.window.caseyHandoffActive(),false);
 const g=fixture({search:''});await g.window.handover();g.window.HandoffAPI.call=statusReply({consumed:true}).bind(g);await g.poll();assert.ok(!g.events.includes('casey:handoff-consumed'),'non-demo emits nothing new');
});
test('an expired QR can be re-issued with the case key',async()=>{
 const f=fixture({storage:at(1)});const call=f.window.HandoffAPI.call;void f.window.send('badge');await f.run();await f.end();
 f.window.HandoffAPI.call=statusReply({consumed:false,expired:true}).bind(f);await f.poll();assert.equal(f.window.caseyHandoffActive(),false);
 f.window.HandoffAPI.call=call;f.key('Digit2');await f.run();await f.end();assert.equal(f.issues(),2);assert.equal(new URL(f.qr.at(-1)).searchParams.get('intent'),'badge');
});
test('five consecutive status failures clear the link and show the error (demo and non-demo)',async()=>{
 for(const search of ['?demo=1','']){
  const f=fixture({search,storage:at(1)});await f.window.handover(undefined,'badge');assert.equal(f.window.caseyHandoffActive(),true);
  f.window.HandoffAPI.call=statusReply(Error('offline')).bind(f);
  for(let n=0;n<4;n++)await f.poll();assert.equal(f.window.caseyHandoffActive(),true,'four failures keep the link');
  await f.poll();assert.equal(f.window.caseyHandoffActive(),false);assert.equal(f.qrOn(),false);assert.deepEqual(f.cancels(),['link-1']);
  assert.equal(f.el('bePill').textContent,'Collegamento non disponibile. Riprova tra poco.');assert.ok(f.silent.includes('Collegamento non disponibile. Riprova tra poco.'));
  if(search)assert.equal(f.window.CaseyDemo.step(),1);
 }
});
test('a successful status poll resets the failure count',async()=>{
 const f=fixture({search:''});await f.window.handover();
 for(let n=0;n<4;n++){f.window.HandoffAPI.call=statusReply(Error('offline')).bind(f);await f.poll();}
 f.window.HandoffAPI.call=statusReply({consumed:false,expired:false}).bind(f);await f.poll();
 f.window.HandoffAPI.call=statusReply(Error('offline')).bind(f);for(let n=0;n<4;n++)await f.poll();assert.equal(f.window.caseyHandoffActive(),true);
});
test('reset forgets a pending claim so a later consumed event does not advance',async()=>{
 const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();await f.end();f.key('Escape');await f.run();
 f.window.dispatchEvent(new f.window.CustomEvent('casey:handoff-consumed',{detail:{}}));assert.equal(f.window.CaseyDemo.step(),0);
});
test('demo: status failures after the phone reserved the link never clear it (non-demo and unreserved demo unchanged)',async()=>{
 const f=fixture({storage:at(1)});void f.window.send('badge');await f.run();await f.end();
 f.window.HandoffAPI.call=statusReply({consumed:false,expired:false,reserved:true,expires_at:new Date(Date.now()+600000).toISOString()}).bind(f);await f.poll();
 f.window.HandoffAPI.call=statusReply(Error('offline')).bind(f);for(let n=0;n<8;n++)await f.poll();
 assert.equal(f.window.caseyHandoffActive(),true);assert.equal(f.qrOn(),true);assert.deepEqual(f.cancels(),[]);
 f.window.HandoffAPI.call=statusReply({consumed:true}).bind(f);await f.poll();assert.equal(f.window.caseyHandoffActive(),false);assert.equal(f.window.CaseyDemo.step(),2);
 const g=fixture({search:''});await g.window.handover();g.window.HandoffAPI.call=statusReply({consumed:false,expired:false,reserved:true}).bind(g);await g.poll();
 g.window.HandoffAPI.call=statusReply(Error('offline')).bind(g);for(let n=0;n<5;n++)await g.poll();assert.equal(g.window.caseyHandoffActive(),false,'non-demo still clears');
});
test('demo: handoff-consumed is dispatched even when CaseyVoiceSession.stop() rejects',async()=>{
 const f=fixture({storage:at(1)});f.window.CaseyVoiceSession={stop:async()=>{throw Error('stop failed');}};void f.window.send('badge');await f.run();await f.end();
 f.window.HandoffAPI.call=statusReply({consumed:true}).bind(f);await f.poll();
 assert.ok(f.events.includes('casey:handoff-consumed'));assert.equal(f.window.caseyHandoffActive(),false);assert.equal(f.qrOn(),false);
 const g=fixture({search:''});g.window.CaseyVoiceSession={stop:async()=>{throw Error('stop failed');}};await g.window.handover();g.window.HandoffAPI.call=statusReply({consumed:true}).bind(g);await g.poll();
 assert.ok(!g.events.includes('casey:handoff-consumed'));assert.equal(g.window.caseyHandoffActive(),true,'non-demo keeps the 7236e06 behavior');
});
function voice(demo){
 const calls=[];const live={active:false,ready:false,setMuted(){},async start(o){calls.push(['live-start',o]);this.active=this.ready=true;},async stop(){this.active=this.ready=false;}};
 class SR{constructor(){calls.push(['mic']);}start(){}abort(){}}
 const win={CaseyLive:live,SpeechRecognition:SR,speechSynthesis:{cancel(){}},addEventListener(){},dispatchEvent(){},CaseyLanguage:{get:()=>'it-IT'},...(demo?{CaseyDemo:{active:true}}:{})};
 vm.runInNewContext(read('casey-voice-session.js'),{window:win,document:{addEventListener(){}},location:{pathname:'/index.html'},setTimeout,clearTimeout,CustomEvent:class{},SpeechSynthesisUtterance:class{}});
 win.CaseyVoiceSession.configure({send:async()=>'',prepare:async()=>calls.push(['prepare'])});return {calls,voice:win.CaseyVoiceSession};
}
test('CaseyVoiceSession.start() is inert on the demo totem: no Live token, no microphone',async()=>{
 const d=voice(true);await d.voice.start();await d.voice.start({microphone:false});assert.deepEqual(d.calls,[]);assert.equal(d.voice.state,'idle');
 const n=voice(false);await n.voice.start();assert.deepEqual(n.calls.map(c=>c[0]),['prepare','live-start']);assert.equal(n.voice.state,'live');
});
