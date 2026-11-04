import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,0));};
// Europe/Rome: 11:00=10:00Z, 16:00=15:00Z, 14:30=13:30Z, 09:30=08:30Z (CET).
const DAYS={'2026-11-06':['2026-11-06T08:00:00Z','2026-11-06T10:00:00Z','2026-11-06T15:00:00Z'],'2026-11-09':['2026-11-09T13:30:00Z'],'2026-11-10':['2026-11-10T08:30:00Z','2026-11-10T09:00:00Z']};
const CHECKING='Sto verificando lo stato della richiesta…',UNCONFIRMED='Non riesco a confermare l’invio adesso: lo staff può verificarlo dalla coda.';
// Phone fixture: real app-auth-shell.js + app-connected.js + demo-script.js + demo-phone.js, stubbed network and DOM.
function setup({search='?casey=1&lang=it-IT&demo=1&intent=internship',signed=true,storage:initial=[],pending=true,local=new Map(),review=true,reviewThrows=false,reviews=null,slotsThrow=false,profile={display_name:'Giulia Rossi',first_name:'Giulia'},context:serverContext=null,days=DAYS,commitSync='created',commitExtra={}}={}){
 let lastSlot='';const slotAt=id=>{lastSlot=id||lastSlot;const [day,n]=String(lastSlot).split(/-(?=\d+$)/);return (days[day]||[])[+n]||'2030-01-10T09:00:00Z';};
 const calls=[],renders=[],handled=[],entered=[],urls=[],elements=new Map(),listeners={},storage=new Map([...(pending?[['casey-handoff-v2-pending','a'.repeat(64)]]:[]),...initial]);
 const element=tag=>{const e={tag,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},querySelector(){return null;},append(...i){this.children.push(...i);},replaceChildren(...i){e.children=i;},before(c){elements.set(c.id,c);},remove(){elements.delete(e.id);},textContent:'',hidden:false};e.append=(...i)=>e.children.push(...i);Object.defineProperty(e,'id',{set(id){e._id=id;elements.set(id,e);},get(){return e._id;}});return e;};
 const root=element('section');
 const document={documentElement:element('html'),head:element('head'),getElementById:id=>id==='vCasey'?root:elements.get(id)||null,createElement:element,querySelector:()=>element('input'),addEventListener(){}};
 let auth=signed?{access_token:'owner'}:null,version=1;const context=serverContext||[{id:'t',role:'assistant',text:'Ripresa dal totem'}];
 const original={open:()=>calls.push({action:'login-dialog'}),ensure(){},refresh(){},voice:()=>calls.push({action:'live-voice'})};
 const ACT={account:()=>calls.push({action:'act-account'}),'private-chat':()=>calls.push({action:'act-private'}),mic:()=>calls.push({action:'act-mic'})};
 const window={CASEY_CONFIG:{},
  HandoffAPI:{auth:()=>auth,session:()=>'s',sessionKey:'k',saveSession(){},async call(action,args){calls.push({action,args});if(['claim','restore','create'].includes(action))return {chat_id:'owned-chat',session_token:'s',version,context};if(action==='save')return {version:++version};if(action==='chat_turn')return {answer:'LLM',citations:[]};if(action==='operation'){if(args.operation==='slots'){if(slotsThrow)throw Error('calendario offline');if(args.day)return {calendar_connected:true,slots:(days[args.day]||[]).map((t,n)=>typeof t==='object'?{id:args.day+'-'+n,...t}:{id:args.day+'-'+n,starts_at:t})};return {calendar_connected:true,slots:[{id:'slot',starts_at:'2030-01-10T09:00:00Z'}]};}if(args.operation==='prepare')return {draft:{id:'d1',status:'prepared',expires_at:new Date(Date.now()+600000).toISOString(),confirmation_nonce:'n1',slot:{id:args.slot_id,starts_at:slotAt(args.slot_id)}}};if(args.operation==='commit')return {google_sync:commitSync,...commitExtra,draft:{id:'d1',status:'completed',slot:{id:'x',starts_at:slotAt(lastSlot)},result:{google_sync:commitSync}}};return {draft:null};}return {};}},
  CaseyAccount:{profile:async()=>{calls.push({action:'account_profile'});return profile;}},
  CaseyCampusCases:{matches:()=>true,async handle(q){handled.push(q);calls.push({action:'service_case'});const next=reviews?reviews[handled.length-1]:(reviewThrows?'throw':review);if(next==='throw')throw Error('rete');return {matched:true,case:'internship_contract',review_saved:next};}},
  CaseyBeta:{turn:async()=>{calls.push({action:'turn'});return {answer:'x'};}},
  __casey:{ACT,go(){},restoreConversation:(ctx,id)=>renders.push(ctx.map(t=>t.text))},
  CaseyStudentAccess:Object.freeze(original),CaseyChatMerge:{merge:(_b,l)=>l},CaseyLive:{stop:async()=>{}},
  addEventListener:(n,h)=>(listeners[n]||=[]).push(h),dispatchEvent:e=>{for(const h of listeners[e.type]||[])h(e);}};
 window.addEventListener('casey:handoff-entered',e=>entered.push(e.detail));
 const ctx={window,document,location:{hash:'',pathname:'/app-blu.html',search},sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},URLSearchParams,crypto:webcrypto,history:{replaceState:(_s,_t,u)=>urls.push(u)},Intl,Date,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},console,setTimeout,clearTimeout};
 vm.createContext(ctx);for(const f of ['demo-auth-bridge.js','casey-dates.js','app-auth-shell.js','app-connected.js','demo-script.js','demo-phone.js'])vm.runInContext(read(f),ctx);
 return {window,calls,renders,handled,entered,urls,storage,local,elements,original,login:(v={access_token:'owner',user_id:'u1'})=>{auth=v;storage.set('casey-beta-auth-v1',JSON.stringify(v));window.dispatchEvent(new ctx.CustomEvent('casey:profile'));},last:()=>renders.at(-1)||[],script:window.CaseyDemoScript};
}
const step=(s,id)=>s.steps.find(x=>x.id===id);
const P={display_name:'Pietro Bianchi',first_name:'Pietro'};
const card=e=>e.elements.get('nativeOperation');
const buttons=e=>(card(e)?.children||[]).filter(c=>c.tag==='button');
const stageLines=s=>step(s,'stage').phone;
const opened=async opts=>{const e=setup({profile:P,...opts});await e.window.CaseyNativeHandoff.open();await flush();return e;};
test('demo without auth: QR scan opens the real login sheet; after login the claim runs and the session is saved',async()=>{
 const e=setup({signed:false,profile:P});await e.window.CaseyNativeHandoff.open();await flush();
 assert.ok(e.calls.some(c=>c.action==='scan'));assert.ok(e.calls.some(c=>c.action==='login-dialog'),'original CaseyStudentAccess.open called');
 assert.equal(e.storage.get('casey-native-open-pending'),'1');assert.equal(e.entered.length,0);assert.ok(!e.calls.some(c=>c.action==='claim'));
 assert.notEqual(e.elements.get('nativePrivateStatus')?.textContent,'Sessione demo non attiva');
 e.login();e.window.openSheet();await flush();
 assert.equal(e.calls.filter(c=>c.action==='claim').length,1);assert.deepEqual(e.entered.map(d=>d.source),['claim']);
 assert.ok(e.last().includes('Ciao Pietro! '+stageLines(e.script).intro));
 assert.equal(e.local.get('casey-demo-auth-v1'),JSON.stringify({access_token:'owner',user_id:'u1'}),'first save after a QR login');
});
test('demo without auth: account and private-chat entries reach the sign-in',()=>{const e=setup({signed:false,pending:false});e.window.__casey.ACT.account();e.window.__casey.ACT['private-chat']();e.window.CaseyStudentAccess.open();assert.ok(e.calls.some(c=>c.action==='act-account'));assert.ok(e.calls.some(c=>c.action==='act-private'));assert.ok(e.calls.some(c=>c.action==='login-dialog'));});
test('demo without a QR: login does not create the persistent copy',()=>{const e=setup({signed:false,pending:false});e.login();assert.equal(e.local.size,0);});
test('demo with ?setup=1 keeps the original sign-in',async()=>{const e=setup({signed:false,search:'?casey=1&demo=1&setup=1'});e.window.CaseyStudentAccess.open();e.window.__casey.ACT.account();assert.ok(e.calls.some(c=>c.action==='login-dialog'));assert.ok(e.calls.some(c=>c.action==='act-account'));});
const sheetRows=e=>{const sh=(card(e)?.children||[]).find(c=>c.className==='casey-stage-request');if(!sh)return null;const out=[];for(let i=0;i<sh.children.length;i+=3)out.push([sh.children[i].textContent,sh.children[i+1].textContent]);return out;};
test('stage: greeting and question, structured request card, then a native button; no service_case before the tap',async()=>{
 const e=await opened();const p=stageLines(e.script);
 assert.deepEqual(e.last().slice(-2),['Ciao Pietro! Ho preparato la tua richiesta di stage part-time:','La invio allo Student Office per la revisione?']);
 assert.deepEqual(sheetRows(e),[['Studente: ','Pietro Bianchi'],['Corso: ','AI & Data Science (anno 2)'],['Azienda: ','Nordest Analytics Srl'],['Ruolo: ','Data Analyst Intern'],['Impegno: ','part-time · 20 ore/settimana'],['Periodo: ','gennaio – giugno 2027'],['Sede: ','ibrida · Treviso'],['Lezioni da conciliare: ','lunedì–mercoledì mattina'],['Richiesta allo staff: ','verificare la compatibilità dello stage con la frequenza dei corsi'],['Allegati: ','nessuno (il contratto va inviato allo staff)']]);
 assert.equal(e.calls.filter(c=>c.action==='account_profile').length,1,'profile read once');
 assert.equal(e.handled.length,0,'nothing sent before the tap');const [b]=buttons(e);assert.equal(b.textContent,p.button);assert.equal(buttons(e).length,1);assert.equal(card(e).children.at(-1),b,'button below the card');
});
test('stage card: first+last name preferred, fallback «Studente College», values via textContent only',async()=>{
 const full=await opened({profile:{first_name:'Anna',last_name:'Verdi',display_name:'Annie'}});assert.equal(sheetRows(full)[0][1],'Anna Verdi');
 const none=await opened({profile:null});assert.equal(sheetRows(none)[0][1],'Studente College');
 const evil=await opened({profile:{display_name:'<img src=x onerror=1>'}});assert.equal(sheetRows(evil)[0][1],'<img src=x onerror=1>');
});
test('stage query: scripted question first, all details, ≤950 chars, classified as internship by the server',async()=>{
 const {campusCase}=await import('../supabase/functions/_shared/campus-cases.ts').catch(()=>({}));
 const e=await opened();await buttons(e)[0].onclick();await flush();const [q]=e.handled,st=step(e.script,'stage');
 assert.ok(q.startsWith(st.question+'\nDettagli richiesta:\n- Studente: Pietro Bianchi\n'));assert.ok(q.length<=950&&q.length<=e.script.STAGE_MAX);
 for(const [l,v] of e.script.stageRows('Pietro Bianchi'))assert.ok(q.includes('\n- '+l+': '+v),l);
 const norm=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();assert.ok(/internship|tirocinio|\bstage\b/.test(norm)&&/part[\s-]?time/.test(norm),'server classifier regex');
 if(campusCase)assert.equal(campusCase(q),'internship_contract');
 const long=e.script.stageQuery('X'.repeat(5000));assert.ok(long.length<=950);assert.ok(long.startsWith(st.question+'\nDettagli richiesta:'));
});
test('stage tap: disabled while sending, marker persisted before service_case, «in coda» only on review_saved===true',async()=>{
 const e=await opened();const p=stageLines(e.script),[b]=buttons(e);const run=b.onclick();assert.equal(b.disabled,true);const again=b.onclick();await run;await again;await flush();
 assert.deepEqual(e.handled,[e.script.stageQuery('Pietro Bianchi')],'single service_case call');assert.deepEqual(e.last().slice(-2),[p.sending,p.done]);
 const saveMarker=e.calls.findIndex(c=>c.action==='save'&&c.args.context.some(t=>t.text===p.sending)),review=e.calls.findIndex(c=>c.action==='service_case');assert.ok(saveMarker>=0&&review>saveMarker);
 assert.equal(buttons(e).length,0,'button gone after use');
});
test('stage failure: one idempotent re-check, then success or the neutral line',async()=>{
 const ok=await opened({reviews:['throw',true]});await buttons(ok)[0].onclick();await flush();const p=stageLines(ok.script);assert.equal(ok.handled.length,2);assert.deepEqual(ok.last().slice(-3),[p.sending,CHECKING,p.done]);
 for(const reviews of [['throw','throw'],[false,false],['throw',false]]){const e=await opened({reviews});await buttons(e)[0].onclick();await flush();
  assert.equal(e.handled.length,2);assert.deepEqual(e.last().slice(-2),[CHECKING,UNCONFIRMED]);assert.ok(!e.last().some(t=>/in coda|nella coda/i.test(t)),JSON.stringify(e.last()));}
});
test('stage greeting without a profile name drops the name',async()=>{const e=await opened({profile:null});assert.ok(e.last().includes('Ho preparato la tua richiesta di stage part-time:'));assert.ok(!e.last().some(t=>/^Ciao /.test(t)));});
test('stage server-context dedupe: marker or success line hides the button; partial lines are not repeated',async()=>{
 const probe=setup({pending:false}),p=stageLines(probe.script),hi='Ciao Pietro! '+p.intro;
 for(const texts of [[hi,p.ask,p.sending],[p.sending,p.done],[p.done]]){const e=await opened({context:ctxOf(...texts)});assert.equal(buttons(e).length,0,JSON.stringify(texts));assert.equal(e.handled.length,0);for(const t of [hi,p.ask,p.sending,p.done])assert.ok(e.last().filter(x=>x===t).length<=1,t);}
 const e=await opened({context:ctxOf(hi)});assert.equal(e.last().filter(x=>x===hi).length,1);assert.equal(e.last().at(-1),p.ask);assert.equal(buttons(e).length,1,'no marker yet: button shown again');
});
test('second load of the same chat (same tab) does not replay the intent',async()=>{const first=await opened();const kept=[...first.storage].filter(([k])=>k.startsWith('casey-demo-'));const again=await opened({storage:kept});assert.equal(again.handled.length,0);assert.ok(!again.last().includes(stageLines(again.script).ask));});
test('badge: only the scripted days/times are fetched and shown, in script order, after the greeting',async()=>{
 const e=await opened({search:'?casey=1&demo=1&intent=badge'});const ops=e.calls.filter(c=>c.args?.operation==='slots').map(c=>c.args.day);
 assert.deepEqual(ops,['2026-11-06','2026-11-09'],'no default first-day slots() call');
 assert.deepEqual(buttons(e).map(b=>b.textContent),[new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'full',timeStyle:'short'}).format(new Date('2026-11-06T10:00:00Z')),new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'full',timeStyle:'short'}).format(new Date('2026-11-09T13:30:00Z'))]);
 assert.equal(e.last().at(-1),'Ciao Pietro! Ecco i prossimi ritiri del badge:');assert.equal(e.handled.length,0);
 await e.window.CaseyNativeHandoff.restore('owned-chat');await flush();assert.equal(e.last().filter(t=>t==='Ciao Pietro! Ecco i prossimi ritiri del badge:').length,1);
});
test('career: missing scripted slots are skipped; none left -> neutral no-slots text',async()=>{
 const e=await opened({search:'?casey=1&demo=1&intent=career',days:{'2026-11-06':['2026-11-06T15:00:00Z'],'2026-11-10':[]}});assert.equal(buttons(e).length,1);assert.deepEqual(e.calls.filter(c=>c.args?.operation==='slots').map(c=>c.args.day),['2026-11-06','2026-11-10']);
 assert.equal(e.last().at(-1),'Ciao Pietro! Ecco gli slot liberi con il Career Service:');
 const n=await opened({search:'?casey=1&demo=1&intent=career',days:{}});assert.equal(buttons(n).length,0);assert.ok(card(n).children.some(c=>c.textContent==='Nessun orario disponibile: indica un altro giorno.'));
});
test('career: prepare then only «Confermo appuntamento» commits; success line uses the real slot in Europe/Rome',async()=>{
 const e=await opened({search:'?casey=1&demo=1&intent=career',commitExtra:{email_status:'sent'}});const slot=buttons(e).find(b=>/16:00/.test(b.textContent));await slot.onclick();
 assert.ok(!e.calls.some(c=>c.args?.operation==='commit'),'choosing a slot never commits');const confirm=buttons(e).find(b=>b.textContent==='Confermo appuntamento');assert.ok(confirm);await confirm.onclick();await flush();
 assert.equal(e.calls.filter(c=>c.args?.operation==='commit').length,1);
 assert.equal(e.last().at(-1),'Appuntamento confermato: venerdì 6 novembre alle 16:00 con il Career Service. Ti ho mandato la conferma via email. E in bocca al lupo per lo stage!');
});
test('scripted slots require the same Europe/Rome date and time; naive local_start is Rome wall time',async()=>{
 const wrong=await opened({search:'?casey=1&demo=1&intent=career',days:{'2026-11-06':['2026-11-09T15:00:00Z'],'2026-11-10':['2026-11-11T08:30:00Z']}});assert.equal(buttons(wrong).length,0,'same HH:MM on another date is not offered');
 const naive=await opened({search:'?casey=1&demo=1&intent=career',days:{'2026-11-06':[{local_start:'2026-11-06T16:00:00'},{local_start:'2026-11-07T16:00:00'}],'2026-11-10':[{local_start:'2026-11-10 09:30'}]}});assert.equal(buttons(naive).length,2);
 const s=naive.script;assert.equal(JSON.stringify(s.slotParts({local_start:'2026-11-06T16:00:00'})),'{"date":"2026-11-06","time":"16:00"}');assert.equal(JSON.stringify(s.slotParts({starts_at:'2026-11-06T23:30:00Z'})),'{"date":"2026-11-07","time":"00:30"}');assert.equal(s.slotParts({}),null);
});
test('career: no email claim when sync is uncertain or the email failed',async()=>{
 const u=await opened({search:'?casey=1&demo=1&intent=career',commitSync:'pending'});await buttons(u)[0].onclick();await buttons(u).find(b=>b.textContent==='Confermo appuntamento').onclick();await flush();assert.equal(u.last().at(-1),'Richiesta salvata; verifica della sincronizzazione in corso.');
 const m=await opened({search:'?casey=1&demo=1&intent=career',commitExtra:{email_status:'failed'}});await buttons(m)[0].onclick();await buttons(m).find(b=>b.textContent==='Confermo appuntamento').onclick();await flush();assert.equal(m.last().at(-1),'Appuntamento confermato: venerdì 6 novembre alle 16:00 con il Career Service. E in bocca al lupo per lo stage!');
 for(const extra of [{},{email_status:'not_queued'},{email_status:'sending'}]){const x=await opened({search:'?casey=1&demo=1&intent=career',commitExtra:extra});await buttons(x)[0].onclick();await buttons(x).find(b=>b.textContent==='Confermo appuntamento').onclick();await flush();assert.ok(!/email/.test(x.last().at(-1)),JSON.stringify(extra));}
});
test('badge commit keeps the existing success text (no Career Service line)',async()=>{const e=await opened({search:'?casey=1&demo=1&intent=badge'});await buttons(e)[0].onclick();await buttons(e).find(b=>b.textContent==='Confermo appuntamento').onclick();await flush();assert.equal(e.last().at(-1),'Appuntamento confermato sul calendario.');});
test('free text in demo never calls chat_turn, turn or service_case',async()=>{const e=setup({search:'?casey=1&demo=1'});await e.window.CaseyNativeHandoff.open();await flush();const r=await e.window.CaseyApp.answer('Che tempo fa domani?');const direct=await e.window.CaseyNativeHandoff.answer('Altra domanda');assert.equal(r.text,e.script.fallback.text);assert.equal(direct.text,r.text);assert.ok(!e.calls.some(c=>['chat_turn','turn'].includes(c.action)));assert.equal(e.handled.length,0);e.window.__casey.ACT.mic();assert.ok(!e.calls.some(c=>c.action==='act-mic'));});
test('booking phase in demo still uses the real slots path',async()=>{const e=await opened({search:'?casey=1&demo=1&intent=badge'});const before=e.calls.filter(c=>c.args?.operation==='slots').length;await e.window.CaseyNativeHandoff.answer('Vorrei prenotare un appuntamento per domani alle 10');assert.ok(e.calls.filter(c=>c.args?.operation==='slots').length>before);assert.ok(!e.calls.some(c=>c.action==='chat_turn'));});
const ctxOf=(...texts)=>[{id:'t',role:'assistant',text:'Ripresa dal totem'},...texts.map((text,n)=>({id:'s'+n,role:'assistant',text}))];
const scriptedLines=e=>{const s=e.script;return ['Ciao Pietro! '+step(s,'badge').phone.intro,'Ciao Pietro! '+step(s,'career').phone.intro,'Ciao Pietro! '+stageLines(s).intro,stageLines(s).ask];};
test('handoff-entered carries its source and demo acts only on claim',async()=>{
 const e=await opened();assert.deepEqual(e.entered.map(d=>d.source),['claim']);
 await e.window.CaseyNativeHandoff.restore('owned-chat');await e.window.CaseyNativeHandoff.newChat();await flush();assert.deepEqual(e.entered.map(d=>d.source),['claim','restore','create']);
 assert.equal(e.handled.length,0);assert.equal(e.calls.filter(c=>c.action==='account_profile').length,1,'scripted lines only on claim');
});
test('newChat and restore with intent in the URL run no service_case, greeting or scripted line',async()=>{
 for(const search of ['?casey=1&demo=1&intent=internship','?casey=1&demo=1&intent=badge','?casey=1&demo=1&intent=career'])for(const run of [n=>n.newChat(),n=>n.restore('owned-chat')]){
  const e=setup({search,pending:false,profile:P});await run(e.window.CaseyNativeHandoff);await flush();
  assert.equal(e.entered.length,1);assert.equal(e.handled.length,0);assert.ok(!e.calls.some(c=>c.action==='account_profile'));
  const lines=scriptedLines(e);assert.ok(!e.last().some(t=>lines.includes(t)),JSON.stringify(e.last()));
 }
});
test('a reload restoring the stored chat (no QR token) does not replay the intent',async()=>{
 const e=setup({pending:false,profile:P,storage:[['casey-handoff-v2-chat-id','owned-chat']]});await e.window.CaseyNativeHandoff.open();await flush();
 assert.deepEqual(e.entered.map(d=>d.source),['restore']);assert.equal(e.handled.length,0);assert.ok(!e.last().some(t=>scriptedLines(e).includes(t)));
});
test('a failed restore enter dispatches no handoff-entered event',async()=>{
 const e=setup({search:'?casey=1&demo=1&intent=badge',slotsThrow:true,pending:false,storage:[['casey-handoff-v2-chat-id','owned-chat']]});await assert.rejects(e.window.CaseyNativeHandoff.open());await flush();
 assert.deepEqual(e.entered,[]);assert.ok(!e.calls.some(c=>c.action==='account_profile'));
});
test('a claim whose slots fail still dispatches handoff-entered with error, shows the error and skips the slots intro',async()=>{
 const e=setup({search:'?casey=1&demo=1&intent=badge',slotsThrow:true,profile:P});await assert.rejects(e.window.CaseyNativeHandoff.open(),/calendario offline/);await flush();
 assert.equal(e.entered.length,1);assert.equal(e.entered[0].source,'claim');assert.equal(e.entered[0].error,true);
 assert.equal(e.elements.get('nativePrivateStatus').textContent,'Operazione non disponibile. Riprova.');
 assert.ok(e.last().includes('Ciao Pietro!'),'claim consumed: greeting still runs');assert.ok(!e.last().some(t=>t.includes(step(e.script,'badge').phone.intro)));
 const ok=await opened({search:'?casey=1&demo=1&intent=badge'});assert.equal(ok.entered[0].error,undefined);
});
test('without ?demo=1 nothing changes',async()=>{const e=setup({search:'?casey=1&intent=internship'});assert.equal(e.window.CaseyDemoPhone.active,false);assert.equal(e.window.CaseyDemoPhone.intent(),null);assert.equal(e.window.CaseyNativeHandoff.answerOverride,undefined);assert.equal(e.window.CaseyStudentAccess,e.window.CaseyStudentAccess);assert.equal(e.window.CaseyStudentAccess.open,e.original.open);await e.window.CaseyNativeHandoff.open();await flush();assert.equal(e.handled.length,0);assert.ok(!e.calls.some(c=>c.action==='account_profile'));await e.window.CaseyNativeHandoff.answer('Domanda');assert.ok(e.calls.some(c=>c.action==='chat_turn'));e.window.__casey.ACT.mic();assert.ok(e.calls.some(c=>c.action==='act-mic'));});
test('app-blu loads demo scripts after the account shell and student access',()=>{const s=read('app-blu.html');const at=f=>s.indexOf('<script src="'+f+'"></script>');assert.ok(at('app-auth-shell.js')>0&&at('student-access.js')<at('demo-script.js')&&at('demo-script.js')<at('demo-phone.js'));assert.ok(at('demo-auth-bridge.js')>0&&at('demo-auth-bridge.js')<at('handoff-client.js')&&at('demo-auth-bridge.js')<at('beta-client.js'),'auth bridge runs before every auth reader');});
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

test('demo bridge: the first copy is saved only from a ?setup=1 tab',()=>{
 const local=new Map();const plain=tab({local});plain.session.set(AUTH,token(1));plain.emit('casey:profile',{});plain.tick();assert.equal(local.has(COPY),false);
 const s=tab({search:'?demo=1&setup=1',local});s.session.set(AUTH,token(2));s.emit('casey:profile',{});assert.equal(local.get(COPY),token(2));
});
test('demo bridge: a different identity never overwrites or adopts the saved copy; same user may update it',()=>{
 const local=new Map([[COPY,token(1)]]);const other=tab({local,session:new Map([[AUTH,token(5,'u2')]])});other.tick();
 assert.equal(local.get(COPY),token(1),'u2 tab does not overwrite');assert.equal(other.ctx.HandoffAPI.auth().user_id,'u2','u2 tab does not adopt u1');
 other.session.set(AUTH,token(6,'u2'));other.emit('casey:profile',{});assert.equal(local.get(COPY),token(1));
 const setupOther=tab({search:'?demo=1&setup=1',local,session:new Map([[AUTH,token(7,'u2')]])});setupOther.tick();assert.equal(local.get(COPY),token(1),'not even from setup');
 const same=tab({local});same.session.set(AUTH,token(8));same.tick();assert.equal(local.get(COPY),token(8));
});
test('demo bridge: logout of another identity keeps the copy; logout of the saved user removes it',()=>{
 const local=new Map([[COPY,token(1)]]);const other=tab({local,session:new Map([[AUTH,token(5,'u2')]])});other.session.delete(AUTH);other.emit('casey:account-change',{signedOut:true});assert.equal(local.get(COPY),token(1));
 const saved=tab({local});saved.session.delete(AUTH);saved.emit('casey:account-change',{signedOut:true});assert.equal(local.has(COPY),false);
});
