/* Live-demo phone runtime (?demo=1 only). Scripted lines replace chat_turn; real effects (claim, slots, prepare, commit, service_case) stay in existing clients. */
(()=>{'use strict';
const q=new URLSearchParams(location.search),active=q.get('demo')==='1',setup=q.get('setup')==='1';
let consumed=false;
const intent=()=>{const v=q.get('intent');return active&&!consumed&&(v==='badge'||v==='internship')?v:null;};
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
async function greet(ctx){let p=null;try{p=await window.CaseyAccount?.profile();}catch{}const name=String(p?.first_name||p?.display_name||'').trim().split(/\s+/)[0];if(name&&!has(ctx,S.phoneGreeting(name)))await N().say(S.phoneGreeting(name));}
// service_case is idempotent per session (casey_service_reviews by session_id): one re-check with the same
// campus-cases session reads the authoritative state without duplicating the request.
const review=question=>Promise.resolve().then(()=>window.CaseyCampusCases.handle(question)).catch(()=>null);
// Line A is written through say() (persisted server-side) BEFORE service_case, so any later tab sees it and skips the call.
async function internship(ctx){const i=step('internship'),a=text(i.phone[0]);if(has(ctx,a)||has(ctx,text(i.phone[1])))return;if(!await N().say(a))return;let r=await review(i.question);
 if(r?.review_saved!==true){await N().say(CHECKING);r=await review(i.question);}
 await N().say(r?.review_saved===true?text(i.phone[1]):UNCONFIRMED);}
// A claim whose slots() failed (error) skips the badge line: it would point at slots that are not shown.
async function entered(kind,ctx,error){await greet(ctx);if(kind==='internship')await internship(ctx);else if(kind==='badge'&&!error){const l=text(step('badge').phone[0]);if(!has(ctx,l))await N().say(l);}}
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
