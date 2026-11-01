/* Live-demo phone runtime (?demo=1 only). Scripted lines replace chat_turn; real effects (claim, slots, prepare, commit, service_case) stay in existing clients. */
(()=>{'use strict';
const q=new URLSearchParams(location.search),active=q.get('demo')==='1',setup=q.get('setup')==='1';
const intent=()=>{const v=q.get('intent');return active&&(v==='badge'||v==='internship')?v:null;};
window.CaseyDemoPhone=Object.freeze({active,intent});
if(!active)return;
const S=window.CaseyDemoScript,A=window.HandoffAPI,N=()=>window.CaseyNativeHandoff,app=window.__casey;
const OFF='Sessione demo non attiva',ERROR='Non riesco a inviare la richiesta adesso. Riprova tra poco.';
const step=id=>S.steps.find(s=>s.id===id),text=l=>S.render(l.text),fallback=()=>S.render(S.fallback.text);
const locked=()=>!setup&&!A?.auth();
function status(t){let n=document.getElementById('nativePrivateStatus');if(!n){n=document.createElement('p');n.id='nativePrivateStatus';n.className='native-private-status';n.setAttribute('role','status');document.getElementById('vCasey')?.append(n);}n.textContent=t;}
// Login hidden: no sign-in sheet unless the presenter opens ?setup=1 before going live.
const access=window.CaseyStudentAccess;
if(access)window.CaseyStudentAccess=Object.freeze({...access,open(...a){if(locked()){status(OFF);return;}return access.open(...a);}});
if(app?.ACT){for(const name of ['account','private-chat']){const previous=app.ACT[name];if(previous)app.ACT[name]=(...a)=>{if(locked()){status(OFF);return;}return previous(...a);};}
 if(app.ACT.mic)app.ACT.mic=()=>status('Nella demo scrivi qui sotto: la voce è disattivata.');}
const style=document.createElement('style');style.textContent='.casey-demo-locked [data-act="account"],.casey-demo-locked [data-act="private-chat"]{display:none!important}';document.head?.append(style);
const paint=()=>document.documentElement?.classList.toggle('casey-demo-locked',locked());paint();window.addEventListener('casey:account-change',paint);
// Free text: scripted fallback instead of chat_turn/turn/service_case; booking phase stays real (app-auth-shell answer()).
const api=window.CaseyApp;
if(api)window.CaseyApp=Object.freeze({...api,async answer(message){const t=String(message);try{if(!N()?.active&&A?.auth()&&(sessionStorage.getItem('casey-handoff-v2-pending')||sessionStorage.getItem('casey-handoff-v2-chat-id')))await N().open();if(N()?.active)return await N().answer(t);}catch(e){return {text:window.CaseyErrors?.message(e)||'Casey non è raggiungibile in questo momento. Riprova tra poco.',keep:true};}return {text:fallback(),keep:true};}});
if(N())N().answerOverride=async()=>({answer:fallback()});
// After claim: greeting from the server profile, then the scripted intent lines. Each runs once per chat.
const once=key=>{if(sessionStorage.getItem(key))return false;sessionStorage.setItem(key,'1');return true;};
async function greet(chat){if(!once('casey-demo-greet-'+chat))return;let p=null;try{p=await window.CaseyAccount?.profile();}catch{}const name=String(p?.first_name||p?.display_name||'').trim().split(/\s+/)[0];if(name)await N().say(S.phoneGreeting(name));}
async function internship(chat){if(!once('casey-demo-internship-'+chat))return;const i=step('internship');await N().say(text(i.phone[0]));let r=null;try{r=await window.CaseyCampusCases.handle(i.question);}catch{}await N().say(r?.review_saved===true?text(i.phone[1]):ERROR);}
async function entered(chat,kind){await greet(chat);if(kind==='internship')await internship(chat);else if(kind==='badge'&&once('casey-demo-badge-'+chat))await N().say(text(step('badge').phone[0]));}
let queue=Promise.resolve();
window.addEventListener('casey:handoff-entered',e=>{const chat=e.detail?.chat_id,kind=intent();if(!chat||!N())return;queue=queue.then(()=>entered(chat,kind)).catch(err=>status(window.CaseyErrors?.message(err)||'Operazione non disponibile. Riprova.'));});
})();
