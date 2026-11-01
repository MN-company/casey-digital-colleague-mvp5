import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,0));};
const CHECKING='Sto verificando lo stato della richiesta…',UNCONFIRMED='Non riesco a confermare l’invio adesso: lo staff può verificarlo dalla coda.';
// Phone fixture: real app-auth-shell.js + app-connected.js + demo-script.js + demo-phone.js, stubbed network and DOM.
function setup({search='?casey=1&lang=it-IT&demo=1&intent=internship',signed=true,storage:initial=[],pending=true,local=new Map(),review=true,reviewThrows=false,reviews=null,slotsThrow=false,profile={display_name:'Giulia Rossi',first_name:'Giulia'}}={}){
 const calls=[],renders=[],handled=[],entered=[],urls=[],elements=new Map(),listeners={},storage=new Map([...(pending?[['casey-handoff-v2-pending','a'.repeat(64)]]:[]),...initial]);
 const element=tag=>{const e={tag,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},append(...i){this.children.push(...i);},replaceChildren(...i){e.children=i;},before(c){elements.set(c.id,c);},remove(){elements.delete(e.id);},textContent:'',hidden:false};e.append=(...i)=>e.children.push(...i);Object.defineProperty(e,'id',{set(id){e._id=id;elements.set(id,e);},get(){return e._id;}});return e;};
 const root=element('section');
 const document={documentElement:element('html'),head:element('head'),getElementById:id=>id==='vCasey'?root:elements.get(id)||null,createElement:element,querySelector:()=>element('input'),addEventListener(){}};
 let auth=signed?{access_token:'owner'}:null,version=1;const context=[{id:'t',role:'assistant',text:'Ripresa dal totem'}];
 const original={open:()=>calls.push({action:'login-dialog'}),ensure(){},refresh(){},voice:()=>calls.push({action:'live-voice'})};
 const ACT={account:()=>calls.push({action:'act-account'}),'private-chat':()=>calls.push({action:'act-private'}),mic:()=>calls.push({action:'act-mic'})};
 const window={CASEY_CONFIG:{},
  HandoffAPI:{auth:()=>auth,session:()=>'s',sessionKey:'k',saveSession(){},async call(action,args){calls.push({action,args});if(['claim','restore','create'].includes(action))return {chat_id:'owned-chat',session_token:'s',version,context};if(action==='save')return {version:++version};if(action==='chat_turn')return {answer:'LLM',citations:[]};if(action==='operation'){if(args.operation==='slots'){if(slotsThrow)throw Error('calendario offline');return {calendar_connected:true,slots:[{id:'slot',starts_at:'2030-01-10T09:00:00Z'}]};}return {draft:null};}return {};}},
  CaseyAccount:{profile:async()=>{calls.push({action:'account_profile'});return profile;}},
  CaseyCampusCases:{matches:()=>true,async handle(q){handled.push(q);const next=reviews?reviews[handled.length-1]:(reviewThrows?'throw':review);if(next==='throw')throw Error('rete');return {matched:true,case:'internship_contract',review_saved:next};}},
  CaseyBeta:{turn:async()=>{calls.push({action:'turn'});return {answer:'x'};}},
  __casey:{ACT,go(){},restoreConversation:(ctx,id)=>renders.push(ctx.map(t=>t.text))},
  CaseyStudentAccess:Object.freeze(original),CaseyChatMerge:{merge:(_b,l)=>l},CaseyLive:{stop:async()=>{}},
  addEventListener:(n,h)=>(listeners[n]||=[]).push(h),dispatchEvent:e=>{for(const h of listeners[e.type]||[])h(e);}};
 window.addEventListener('casey:handoff-entered',e=>entered.push(e.detail));
 const ctx={window,document,location:{hash:'',pathname:'/app-blu.html',search},sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},URLSearchParams,crypto:webcrypto,history:{replaceState:(_s,_t,u)=>urls.push(u)},Intl,Date,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},console,setTimeout,clearTimeout};
 vm.createContext(ctx);for(const f of ['demo-auth-bridge.js','casey-dates.js','app-auth-shell.js','app-connected.js','demo-script.js','demo-phone.js'])vm.runInContext(read(f),ctx);
 return {window,calls,renders,handled,entered,urls,storage,local,elements,original,last:()=>renders.at(-1)||[],script:window.CaseyDemoScript};
}
const step=(s,id)=>s.steps.find(x=>x.id===id);
test('demo without auth never opens the sign-in sheet and shows the demo status',async()=>{const e=setup({signed:false});await e.window.CaseyStudentAccess.open();e.window.__casey.ACT.account();e.window.__casey.ACT['private-chat']();assert.ok(!e.calls.some(c=>['login-dialog','act-account','act-private'].includes(c.action)));assert.equal(e.elements.get('nativePrivateStatus').textContent,'Sessione demo non attiva');});
test('demo with ?setup=1 keeps the original sign-in',async()=>{const e=setup({signed:false,search:'?casey=1&demo=1&setup=1'});e.window.CaseyStudentAccess.open();e.window.__casey.ACT.account();assert.ok(e.calls.some(c=>c.action==='login-dialog'));assert.ok(e.calls.some(c=>c.action==='act-account'));});
test('internship with review_saved:true appends line A then line B after the real review call',async()=>{const e=setup();await e.window.CaseyNativeHandoff.open();await flush();const s=e.script,i=step(s,'internship');assert.deepEqual(e.handled,[i.question]);const last=e.last();assert.ok(last.includes(s.render(i.phone[0].text)));assert.equal(last.at(-1),s.render(i.phone[1].text));assert.ok(last.indexOf(s.render(i.phone[0].text))<last.indexOf(s.render(i.phone[1].text)));});
test('internship failure: neutral check line, one idempotent re-check, success only on review_saved===true',async()=>{
 const e=setup({reviews:['throw',true]});await e.window.CaseyNativeHandoff.open();await flush();const s=e.script,i=step(s,'internship');
 assert.deepEqual(e.handled,[i.question,i.question],'exactly one re-check with the same question');const last=e.last();
 assert.deepEqual(last.slice(-3),[s.render(i.phone[0].text),CHECKING,s.render(i.phone[1].text)]);
});
test('internship still failing after the re-check never claims the request is queued',async()=>{for(const reviews of [['throw','throw'],[false,false],['throw',false]]){
 const e=setup({reviews});await e.window.CaseyNativeHandoff.open();await flush();const s=e.script,i=step(s,'internship'),last=e.last();
 assert.equal(e.handled.length,2);assert.deepEqual(last.slice(-2),[CHECKING,UNCONFIRMED]);assert.ok(!last.includes(s.render(i.phone[1].text)));
 assert.ok(!last.some(t=>/in coda|nella coda|inserit/i.test(t)),JSON.stringify(last));}});
test('internship success on the first call makes no re-check',async()=>{const e=setup();await e.window.CaseyNativeHandoff.open();await flush();assert.equal(e.handled.length,1);assert.ok(!e.last().includes(CHECKING));});
test('second load of the same chat does not call the review again',async()=>{const first=setup();await first.window.CaseyNativeHandoff.open();await flush();const kept=[...first.storage].filter(([k])=>k.startsWith('casey-demo-'));const again=setup({storage:kept});await again.window.CaseyNativeHandoff.open();await flush();assert.equal(again.handled.length,0);assert.ok(kept.some(([k])=>k==='casey-demo-consumed-owned-chat'));});
test('greeting uses the server profile name only',async()=>{const e=setup();await e.window.CaseyNativeHandoff.open();await flush();assert.ok(e.last().includes(e.script.phoneGreeting('Giulia')));const n=setup({profile:null});await n.window.CaseyNativeHandoff.open();await flush();assert.ok(!n.last().some(t=>/^Ciao |Eccoci sul tuo telefono/.test(t)));});
test('badge intent keeps the real slots flow and appends the scripted badge line once',async()=>{const e=setup({search:'?casey=1&demo=1&intent=badge'});await e.window.CaseyNativeHandoff.open();await flush();assert.ok(e.calls.some(c=>c.action==='operation'&&c.args.operation==='slots'));const line=e.script.render(step(e.script,'badge').phone[0].text);assert.equal(e.last().filter(t=>t===line).length,1);assert.equal(e.handled.length,0);await e.window.CaseyNativeHandoff.restore('owned-chat');await flush();assert.equal(e.last().filter(t=>t===line).length,1);});
test('free text in demo never calls chat_turn, turn or service_case',async()=>{const e=setup({search:'?casey=1&demo=1'});await e.window.CaseyNativeHandoff.open();await flush();const r=await e.window.CaseyApp.answer('Che tempo fa domani?');const direct=await e.window.CaseyNativeHandoff.answer('Altra domanda');assert.equal(r.text,e.script.render(e.script.fallback.text));assert.equal(direct.text,r.text);assert.ok(!e.calls.some(c=>['chat_turn','turn'].includes(c.action)));assert.equal(e.handled.length,0);e.window.__casey.ACT.mic();assert.ok(!e.calls.some(c=>c.action==='act-mic'));});
test('booking phase in demo still uses the real slots path',async()=>{const e=setup({search:'?casey=1&demo=1&intent=badge'});await e.window.CaseyNativeHandoff.open();await flush();const before=e.calls.filter(c=>c.args?.operation==='slots').length;await e.window.CaseyNativeHandoff.answer('Vorrei prenotare un appuntamento per domani alle 10');assert.ok(e.calls.filter(c=>c.args?.operation==='slots').length>before);assert.ok(!e.calls.some(c=>c.action==='chat_turn'));});
test('without ?demo=1 nothing changes',async()=>{const e=setup({search:'?casey=1&intent=internship'});assert.equal(e.window.CaseyDemoPhone.active,false);assert.equal(e.window.CaseyDemoPhone.intent(),null);assert.equal(e.window.CaseyNativeHandoff.answerOverride,undefined);assert.equal(e.window.CaseyStudentAccess,e.window.CaseyStudentAccess);assert.equal(e.window.CaseyStudentAccess.open,e.original.open);await e.window.CaseyNativeHandoff.open();await flush();assert.equal(e.handled.length,0);assert.ok(!e.calls.some(c=>c.action==='account_profile'));await e.window.CaseyNativeHandoff.answer('Domanda');assert.ok(e.calls.some(c=>c.action==='chat_turn'));e.window.__casey.ACT.mic();assert.ok(e.calls.some(c=>c.action==='act-mic'));});
test('app-blu loads demo scripts after the account shell and student access',()=>{const s=read('app-blu.html');const at=f=>s.indexOf('<script src="'+f+'"></script>');assert.ok(at('app-auth-shell.js')>0&&at('student-access.js')<at('demo-script.js')&&at('demo-script.js')<at('demo-phone.js'));assert.ok(at('demo-auth-bridge.js')>0&&at('demo-auth-bridge.js')<at('handoff-client.js')&&at('demo-auth-bridge.js')<at('beta-client.js'),'auth bridge runs before every auth reader');});

const scriptedLines=e=>{const s=e.script;return [s.phoneGreeting('Giulia'),s.render(step(s,'badge').phone[0].text),s.render(step(s,'internship').phone[0].text)];};
test('handoff-entered carries its source and demo acts only on claim',async()=>{
 const e=setup();await e.window.CaseyNativeHandoff.open();await flush();assert.deepEqual(e.entered.map(d=>d.source),['claim']);
 await e.window.CaseyNativeHandoff.restore('owned-chat');await e.window.CaseyNativeHandoff.newChat();await flush();assert.deepEqual(e.entered.map(d=>d.source),['claim','restore','create']);
 assert.equal(e.handled.length,1);
});
test('newChat and restore with intent in the URL run no service_case, greeting or badge line',async()=>{
 for(const search of ['?casey=1&demo=1&intent=internship','?casey=1&demo=1&intent=badge'])for(const run of [n=>n.newChat(),n=>n.restore('owned-chat')]){
  const e=setup({search,pending:false});await run(e.window.CaseyNativeHandoff);await flush();
  assert.equal(e.entered.length,1);assert.equal(e.handled.length,0);assert.ok(!e.calls.some(c=>c.action==='account_profile'));
  const lines=scriptedLines(e);assert.ok(!e.last().some(t=>lines.includes(t)),JSON.stringify(e.last()));
 }
});
test('a reload restoring the stored chat (no QR token) does not replay the intent',async()=>{
 const e=setup({pending:false,storage:[['casey-handoff-v2-chat-id','owned-chat']]});await e.window.CaseyNativeHandoff.open();await flush();
 assert.deepEqual(e.entered.map(d=>d.source),['restore']);assert.equal(e.handled.length,0);assert.ok(!e.last().some(t=>scriptedLines(e).includes(t)));
});
test('a failed enter dispatches no handoff-entered event',async()=>{
 const e=setup({search:'?casey=1&demo=1&intent=badge',slotsThrow:true});await assert.rejects(e.window.CaseyNativeHandoff.open());await flush();
 assert.deepEqual(e.entered,[]);assert.ok(!e.calls.some(c=>c.action==='account_profile'));
});
test('after a claim the intent is consumed: removed from the URL (demo kept) and persisted per chat',async()=>{
 const e=setup({search:'?casey=1&lang=it-IT&demo=1&intent=internship'});assert.equal(e.window.CaseyDemoPhone.intent(),'internship');
 await e.window.CaseyNativeHandoff.open();await flush();
 assert.equal(e.urls.length,1);const url=new URL(e.urls[0],'https://x.example');assert.equal(url.pathname,'/app-blu.html');assert.equal(url.searchParams.get('intent'),null);assert.equal(url.searchParams.get('demo'),'1');assert.equal(url.searchParams.get('lang'),'it-IT');
 assert.equal(e.window.CaseyDemoPhone.intent(),null);assert.equal(e.storage.get('casey-demo-consumed-owned-chat'),'1');
});
test('voice in demo never starts CaseyLive and explains it is unavailable',async()=>{
 const e=setup();await e.window.CaseyStudentAccess.voice(true);await e.window.CaseyStudentAccess.voice(false);assert.ok(!e.calls.some(c=>c.action==='live-voice'));
 assert.equal(e.elements.get('nativePrivateStatus').textContent,'La voce non è disponibile in questa demo.');
 const n=setup({search:'?casey=1'});await n.window.CaseyStudentAccess.voice(true);assert.ok(n.calls.some(c=>c.action==='live-voice'),'non-demo voice unchanged');
});

// Persistent demo login: demo-auth-bridge.js runs in the app-blu head before handoff-client.js/beta-client.js.
const AUTH='casey-beta-auth-v1',COPY='casey-demo-auth-v1';
const EXPIRES=Date.now()+3600000;
const token=(n,user='u1')=>JSON.stringify({access_token:'access-'+n,refresh_token:'refresh-'+n,email:'',user_id:user,expires_at:EXPIRES+n});
function tab({search='?casey=1&demo=1',pathname='/app-blu.html',local,session=new Map(),fetchReply=null}={}){
 const listeners={},doc={},intervals=[],store=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
 const ctx={location:{search,pathname,hash:''},sessionStorage:store(session),localStorage:store(local),URLSearchParams,JSON,Date,AbortSignal,
  CASEY_CONFIG:{supabaseUrl:'https://example.invalid',publishableKey:'public-test',handoffUrl:'https://example.invalid/functions/v1/h'},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  document:{visibilityState:'visible',addEventListener:(n,f)=>(doc[n]||=[]).push(f)},
  addEventListener:(n,f)=>(listeners[n]||=[]).push(f),dispatchEvent:e=>{for(const f of listeners[e.type]||[])f(e);return true;},
  setInterval:f=>intervals.push(f),
  fetch:async()=>{if(!fetchReply)throw Error('no network');return {ok:true,status:200,json:async()=>fetchReply};}};
 ctx.window=ctx;vm.createContext(ctx);for(const f of ['demo-auth-bridge.js','handoff-client.js'])vm.runInContext(read(f),ctx);
 return {ctx,session,local,tick:()=>{for(const f of intervals)f();},emit:(n,detail)=>ctx.dispatchEvent(new ctx.CustomEvent(n,{detail})),storageEvent:(key,newValue,oldValue=null)=>{for(const f of listeners.storage||[])f({key,newValue,oldValue});}};
}
test('a new tab (fresh sessionStorage, shared localStorage) is already authenticated in demo',()=>{
 const local=new Map();const setupTab=tab({search:'?demo=1&setup=1',local});setupTab.session.set(AUTH,token(1));setupTab.emit('casey:profile',{});
 assert.equal(local.get(COPY),token(1));
 const qrTab=tab({search:'?casey=1&lang=it-IT&demo=1&intent=badge',local});assert.ok(qrTab.ctx.HandoffAPI.auth());assert.equal(qrTab.ctx.HandoffAPI.auth().access_token,'access-1');
});
test('refresh-token rotation is mirrored into the demo copy',async()=>{
 const local=new Map([[COPY,JSON.stringify({access_token:'old',refresh_token:'refresh-old',user_id:'u1',expires_at:Date.now()-1000})]]);
 const t=tab({local,fetchReply:{access_token:'access-2',refresh_token:'refresh-2',expires_in:3600,user:{email:'',id:'u1'}}});
 assert.equal(t.ctx.HandoffAPI.auth(),null,'expired access token');await t.ctx.HandoffAPI.refresh();t.tick();
 assert.equal(JSON.parse(local.get(COPY)).refresh_token,'refresh-2');
});
test('a newer copy from another tab is adopted for the same user only',()=>{
 const local=new Map([[COPY,token(1)]]);const t=tab({local});assert.equal(t.ctx.HandoffAPI.auth().access_token,'access-1');
 local.set(COPY,token(2));t.storageEvent(COPY,token(2),token(1));assert.equal(t.ctx.HandoffAPI.auth().access_token,'access-2');
 t.storageEvent(COPY,token(3,'other'),token(2));assert.equal(t.ctx.HandoffAPI.auth().access_token,'access-2');
});
test('logout removes the demo copy; a stale tab logging out keeps a newer copy',()=>{
 const local=new Map([[COPY,token(1)]]);const t=tab({local});t.session.delete(AUTH);t.emit('casey:account-change',{signedOut:true});assert.equal(local.has(COPY),false);
 const shared=new Map([[COPY,token(1)]]);const stale=tab({local:shared});shared.set(COPY,token(2));stale.session.delete(AUTH);stale.emit('casey:account-change',{signedOut:true});assert.equal(shared.get(COPY),token(2));
});
test('without ?demo=1, or outside app-blu, localStorage is never written',()=>{
 for(const opts of [{search:'?casey=1'},{search:'?demo=1',pathname:'/index.html'},{search:'?demo=1',pathname:'/app-rossa.html'}]){
  const local=new Map(),t=tab({...opts,local});t.session.set(AUTH,token(1));t.emit('casey:profile',{});t.emit('casey:account-change',{});t.tick();
  assert.equal(local.size,0);assert.equal(t.ctx.CaseyDemoAuth,undefined);
 }
 const local=new Map([[COPY,token(1)]]),t=tab({search:'?casey=1',local});assert.equal(t.ctx.HandoffAPI.auth(),null,'non-demo never reads the demo copy');
});
test('setup mode shows the saved-session status and "Esci dalla demo" clears both copies',async()=>{
 const local=new Map([[COPY,token(1)]]);const e=setup({search:'?demo=1&setup=1',pending:false,local});
 const panel=e.elements.get('caseyDemoSetup');assert.ok(panel&&!panel.hidden);assert.equal(panel.children[0].textContent,'Sessione demo salvata su questo dispositivo');
 const exit=panel.children[1];assert.equal(exit.textContent,'Esci dalla demo');e.storage.set(AUTH,token(1));await exit.onclick();
 assert.equal(local.has(COPY),false);assert.equal(e.storage.has(AUTH),false);
 const n=setup({search:'?demo=1',pending:false,local:new Map([[COPY,token(1)]])});assert.ok(!n.elements.get('caseyDemoSetup')||n.elements.get('caseyDemoSetup').hidden,'no setup controls outside setup mode');
});
