/* Live-demo phone runtime (?demo=1 only). Scripted lines replace chat_turn; real effects (claim, slots, prepare, commit, service_case) stay in existing clients. */
(()=>{'use strict';
const q=new URLSearchParams(location.search),active=q.get('demo')==='1',setup=q.get('setup')==='1';
let consumed=false;
const intent=()=>{const v=q.get('intent');return active&&!consumed&&(v==='badge'||v==='internship'||v==='career')?v:null;};
window.CaseyDemoPhone=Object.freeze({active,intent});
if(!active)return;
const S=window.CaseyDemoScript,A=window.HandoffAPI,N=()=>window.CaseyNativeHandoff,app=window.__casey;
const OFF='Sessione demo non attiva',VOICE_OFF='La voce non è disponibile in questa demo.',CHECKING='Sto verificando lo stato della richiesta…',UNCONFIRMED='Non riesco a confermare l’invio adesso: lo staff può verificarlo dalla coda.';
const step=id=>S.steps.find(s=>s.id===id),text=l=>S.render(l.text),fallback=()=>S.render(S.fallback.text);
const locked=()=>!setup&&!A?.auth();
function status(t){let n=document.getElementById('nativePrivateStatus');if(!n){n=document.createElement('p');n.id='nativePrivateStatus';n.className='native-private-status';n.setAttribute('role','status');document.getElementById('vCasey')?.append(n);}n.textContent=t;}
// Login hidden: no sign-in sheet unless the presenter opens ?setup=1 before going live. No Gemini Live voice in demo.
const access=window.CaseyStudentAccess;
if(access)window.CaseyStudentAccess=Object.freeze({...access,open(...a){if(locked()){status(OFF);return;}return access.open(...a);},async voice(){status(VOICE_OFF);}});
if(app?.ACT){for(const name of ['account','private-chat']){const previous=app.ACT[name];if(previous)app.ACT[name]=(...a)=>{if(locked()){status(OFF);return;}return previous(...a);};}
 if(app.ACT.mic)app.ACT.mic=()=>status('Nella demo scrivi qui sotto: la voce è disattivata.');}
const style=document.createElement('style');style.textContent='.casey-demo-locked [data-act="account"],.casey-demo-locked [data-act="private-chat"]{display:none!important}';document.head?.append(style);
const paint=()=>document.documentElement?.classList.toggle('casey-demo-locked',locked());paint();window.addEventListener('casey:account-change',paint);
// Setup mode: show that the session is saved for later QR tabs (demo-auth-bridge.js) and allow leaving the demo.
function setupPanel(){
 if(!setup)return;let panel=document.getElementById('caseyDemoSetup');
 if(!panel){panel=document.createElement('div');panel.id='caseyDemoSetup';panel.className='native-private-status';panel.setAttribute('role','status');
  const note=document.createElement('p');note.textContent='Sessione demo salvata su questo dispositivo';
  const exit=document.createElement('button');exit.type='button';exit.textContent='Esci dalla demo';
  exit.onclick=async()=>{window.CaseyDemoAuth?.clear();try{if(window.CaseyBeta?.logout)await window.CaseyBeta.logout();else sessionStorage.removeItem(A?.authKey||'casey-beta-auth-v1');}catch{}sessionStorage.removeItem(A?.authKey||'casey-beta-auth-v1');window.CaseyDemoAuth?.clear();setupPanel();};
  panel.append(note,exit);document.getElementById('vCasey')?.append(panel);}
 panel.hidden=!window.CaseyDemoAuth?.saved();
}
setupPanel();for(const n of ['casey:demo-auth','casey:account-change','casey:profile'])window.addEventListener(n,setupPanel);
// Free text: scripted fallback instead of chat_turn/turn/service_case; booking phase stays real (app-auth-shell answer()).
const api=window.CaseyApp;
if(api)window.CaseyApp=Object.freeze({...api,async answer(message){const t=String(message);try{if(!N()?.active&&A?.auth()&&(sessionStorage.getItem('casey-handoff-v2-pending')||sessionStorage.getItem('casey-handoff-v2-chat-id')))await N().open();if(N()?.active)return await N().answer(t);}catch(e){return {text:window.CaseyErrors?.message(e)||'Casey non è raggiungibile in questo momento. Riprova tra poco.',keep:true};}return {text:fallback(),keep:true};}});
if(N())N().answerOverride=async()=>({answer:fallback()});
// After a QR claim only: greeting from the server profile, then the scripted intent lines.
// The name comes from CaseyAccount.profile() (server account_profile with the display name). HandoffAPI
// operation:'profile' is not used: it returns only institution/program, never a name.
// Cross-tab dedupe: the server-owned chat context restored on claim is authoritative. A new tab has a fresh
// sessionStorage and a new campus-cases session token, so neither the per-tab key nor the server's session_id
// dedupe can see another tab's work; a line already in the server context is never appended or acted on again.
const has=(ctx,t)=>(ctx||[]).some(x=>x?.role==='assistant'&&x.text===t);
async function name(){let p=null;try{p=await window.CaseyAccount?.profile();}catch{}return String(p?.first_name||p?.display_name||'').trim().split(/\s+/)[0]||'';}
// First line: «Ciao <nome>! <intro>», or the intro alone without a name. Any greeting variant already in the context counts.
async function opening(ctx,intro){const n=await name(),l=S.phoneGreeting(n,intro);if(!l||has(ctx,l)||(ctx||[]).some(x=>x?.role==='assistant'&&intro&&String(x.text).endsWith(intro)))return true;return N().say(l);}
async function sayOnce(ctx,l){return has(ctx,l)?true:N().say(l);}
// service_case is idempotent per session (casey_service_reviews by session_id): one re-check with the same
// campus-cases session reads the authoritative state without duplicating the request.
const review=question=>Promise.resolve().then(()=>window.CaseyCampusCases.handle(question)).catch(()=>null);
// Stage: summary + question, then a native card button. service_case runs ONLY on tap. The "sending" marker
// line is persisted through say() BEFORE service_case, so any later tab sees it and never shows the button again.
async function stage(ctx){const i=step('stage'),p=i.phone;if(has(ctx,p.sending)||has(ctx,p.done))return;
 if(!await opening(ctx,p.intro)||!await sayOnce(ctx,p.summary)||!await sayOnce(ctx,p.ask))return;
 const c=N().operationCard?.();if(!c)return;c.setAttribute?.('aria-label','Richiesta Student Office');c.hidden=false;
 const b=document.createElement('button');b.type='button';b.textContent=p.button;let used=false;
 b.onclick=async()=>{if(used)return;used=true;b.disabled=true;try{await send(i);}catch(e){status(window.CaseyErrors?.message(e)||'Operazione non disponibile. Riprova.');}finally{c.replaceChildren();c.hidden=true;}};
 c.replaceChildren(b);}
async function send(i){const p=i.phone;if(!await N().say(p.sending))return;let r=await review(i.question);
 if(r?.review_saved!==true){await N().say(CHECKING);r=await review(i.question);}
 await N().say(r?.review_saved===true?p.done:UNCONFIRMED);}
// Badge/career: the backend returns only the first free day without `day`, so fetch each scripted day and keep
// only the scripted Europe/Rome times, in script order, rendered by the native slot card (prepare -> «Confermo appuntamento»).
async function scriptedSlots(id){const want=step(id).phoneSlots||[],days=[...new Set(want.map(x=>x.day))],byDay=new Map();let connected=true;
 for(const day of days){const r=await N().fetchSlots({day});if(r?.calendar_connected===false)connected=false;byDay.set(day,r?.slots||[]);}
 const picked=[],seen=new Set();for(const w of want)for(const slot of byDay.get(w.day)||[]){const iso=slot.starts_at||slot.start||slot.local_start;if(S.slotTime(iso)===w.time&&!seen.has(slot.id)){seen.add(slot.id);picked.push(slot);}}
 return N().renderSlots({calendar_connected:connected,slots:picked});}
const slotKind=intent();if(slotKind==='badge'||slotKind==='career'){const n=N();if(n)n.slotsOverride=()=>{n.slotsOverride=undefined;return scriptedSlots(slotKind);};}
// The email line is claimed only for google_sync==='created' (app-auth-shell) and never when the result reports an email failure.
const emailFailed=r=>[r?.email,r?.email_status,r?.notification,r?.email_sent].some(v=>v===false||/fail|error|uncertain|pending|skip/i.test(String(v??'')));
function career(){N().onCommitted=(r,slot)=>emailFailed(r)?undefined:(S.careerConfirmed(slot?.starts_at||slot?.start||slot?.local_start)||undefined);}
// A claim whose slots failed (error) skips the intro: it would point at slots that are not shown.
async function entered(kind,ctx,error){
 if(kind==='internship')return stage(ctx);
 if(kind==='badge'||kind==='career'){if(kind==='career')career();return opening(ctx,error?'':step(kind).phone.intro);}
}
// Single use: drop intent from the URL (demo and the rest kept), so reloads, restores and new chats never replay it.
function forgetIntent(){if(!q.has('intent'))return;const next=new URLSearchParams(location.search);next.delete('intent');const search=next.toString();history.replaceState(null,'',location.pathname+(search?'?'+search:'')+(location.hash||''));}
let queue=Promise.resolve();
window.addEventListener('casey:handoff-entered',e=>{
 const chat=e.detail?.chat_id;if(e.detail?.source!=='claim'||!chat||!N())return;
 const key='casey-demo-consumed-'+chat,kind=intent();consumed=true;
 // Secondary per-tab guard; the authoritative check is the server context in entered().
 if(sessionStorage.getItem(key)){forgetIntent();return;}sessionStorage.setItem(key,'1');
 const ctx=e.detail.context||[],error=e.detail.error===true;
 queue=queue.then(()=>entered(kind,ctx,error)).catch(err=>status(window.CaseyErrors?.message(err)||'Operazione non disponibile. Riprova.')).finally(forgetIntent);
});
})();
