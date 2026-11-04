/* Totem live demo (?demo=1): ordered script, browser speech with live subtitles, pre-recorded audio.
   Only handover() is real. No turn/classify/knowledge/Live calls; without ?demo=1 this file does nothing. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('demo')!=='1')return;
const S=window.CaseyDemoScript;if(!S)return;
// CASEY_CONFIG is frozen: publish a frozen superset. Later scripts read the new object; earlier ones must read window.CASEY_CONFIG at call time.
window.CASEY_CONFIG=Object.freeze({...(window.CASEY_CONFIG||{}),demoActive:true,demoAppBase:location.origin+'/'});
const KEY='casey-demo-step',MAX_ERRORS=5,FATAL=['not-allowed','service-not-allowed','audio-capture'],timers=new Set(),pending=new Set();
let revision=0,running=false,voiceOn=false,recognizer=null,audio=null,handing=false,errors=0,claimStep=null;
const $=id=>document.getElementById(id);
const avatar=k=>window.setAvatarState?.(k);
const caption=t=>{const p=$('capText');if(p)p.textContent=t;};
// A QR link on screen (definitivo-kiosk.js) or a handover in flight: speech must not advance or cancel it.
const linkBusy=()=>handing||!!window.caseyHandoffActive?.();
function step(){const n=parseInt(sessionStorage.getItem(KEY)||'0',10);return Number.isInteger(n)&&n>0?Math.min(n,S.steps.length):0;}
const setStep=n=>sessionStorage.setItem(KEY,String(n));
function later(ms,fn){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
function wait(ms,rev){return new Promise(res=>{pending.add(res);later(ms,()=>{pending.delete(res);res(rev===revision);});});}
function paint(){const mic=$('micBtn');if(!mic)return;const on=voiceOn||running;mic.classList.toggle('on',on);const label=on?'Ferma Casey':'Parla con Casey';mic.setAttribute('aria-label',label);mic.title=label;}
function dropRecognizer(){const r=recognizer;recognizer=null;if(r){r.onresult=r.onend=r.onerror=null;try{r.abort();}catch{}}}
const backoff=()=>Math.min(8000,350*2**errors);
// Resolves true when the line finished in this revision; false if stopped meanwhile.
function playLine(line,rev){
 if(rev!==revision)return Promise.resolve(false);
 // No `end` argument: say() would otherwise schedule an untracked idle timer. The avatar is re-asserted after say() for every line.
 const text=S.render(line.text);window.say(text);window.CaseyDialogue?.append('assistant',text);avatar('C');
 return new Promise(resolve=>{
  let done=false,silent=false,a=null,retried=false;
  const finish=ok=>{if(done)return;done=true;pending.delete(finish);if(audio===a)audio=null;resolve(ok&&rev===revision);};
  pending.add(finish);
  const live=()=>!done&&!silent&&rev===revision;
  const fallback=()=>{if(!live())return;silent=true;if(audio===a)audio=null;avatar('C');later(Math.max(2000,text.length*55),()=>finish(true));};
  // Autoplay policy: a play() rejected for lack of a user gesture is retried once after unlocking the clips.
  const start=()=>{if(!live())return;try{const p=a.play();p?.catch?.(e=>{if(!live())return;if(e?.name==='NotAllowedError'&&!retried){retried=true;Promise.resolve(unlockAudio(true)).then(start);}else fallback();});}catch{fallback();}};
  a=clip(line.audio);
  if(!a){fallback();return;}
  audio=a;try{a.currentTime=0;}catch{}a.onended=()=>{if(rev===revision&&!silent)finish(true);};a.onerror=fallback;
  // Not buffered yet: wait for canplaythrough (max 3 s) instead of dropping to silent text at once.
  if(typeof a.readyState==='number'&&a.readyState<3){
   let waiting=true;const go=()=>{if(!waiting)return;waiting=false;a.removeEventListener?.('canplaythrough',go);start();};
   a.addEventListener?.('canplaythrough',go);
   later(3000,()=>{if(!waiting)return;waiting=false;a.removeEventListener?.('canplaythrough',go);fallback();});
  }else start();
 }).then(ok=>{if(ok)avatar('A');return ok;});
}
// Runs case i (or the fallback when i<0) exactly like speech. `said` is shown as the user message.
// A QR still on screen is cancelled first: the new case (or the same case again) issues a fresh link.
async function runCase(i,said){
 if(running||handing)return;
 $('q')?.blur?.();
 const rev=revision,current=S.steps[i]||null;said=String(said||'').trim()||current?.question||'';
 running=true;dropRecognizer();paint();
 try{
  if(window.caseyHandoffActive?.()){claimStep=null;await window.caseyHandoffCancel?.();if(rev!==revision)return;window.CaseyDialogue?.clear?.();}
  if(said){window.CaseyDialogue?.append('user',said);caption(said);}
  avatar('E');if(!await wait(700,rev))return;
  for(const line of current?current.totem:[S.fallback])if(!await playLine(line,rev))return;
  if(!current)return;
  if(!current.handoff){setStep(i+1);return;}
  if(rev!==revision)return;
  handing=true;let r;
  try{r=await window.handover?.(undefined,current.handoff.intent);}finally{handing=false;}
  if(rev!==revision){if(r?.status==='handoff_ready')void window.caseyHandoffCancel?.();return;}
  // The presenter may not scan: the sequence advances once the QR is on screen. A failed link keeps the step
  // (press the case key again to retry). A later claim only confirms it (casey:handoff-consumed).
  if(r?.status==='handoff_ready'){claimStep=i;setStep(i+1);}
 }finally{if(rev===revision){running=false;micOff();}}
}
// Free speech/text: keyword score picks the case; tie or no hit -> the expected next case (fallback after the last).
function advance(text){const i=step();return runCase(S.pick(text,i<S.steps.length?i:-1),text);}
function retry(){if(errors>=MAX_ERRORS){caption('Microfono in pausa dopo troppi errori. Premi il microfono per riprendere.');stop();return;}later(backoff(),listen);}
function listen(){
 if(!voiceOn||running||recognizer)return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){caption('La voce non è disponibile in questo browser. Puoi continuare a scrivere.');stop();return;}
 const rev=revision,r=new SR();recognizer=r;r.lang='it-IT';r.interimResults=true;r.continuous=false;let failed=false;
 r.onresult=e=>{
  if(rev!==revision||recognizer!==r)return;errors=0;let text='',final=false;
  for(let k=0;k<e.results.length;k++){text+=e.results[k][0]?.transcript||'';if(e.results[k].isFinal)final=true;}
  text=text.trim();if(!text)return;caption(text);
  if(!final)return;dropRecognizer();
  // QR on screen: only a phrase that names a case moves on (cancelling the link); anything else keeps the QR.
  if(linkBusy()){const n=S.pick(text,-1);if(n>=0&&!handing)void runCase(n,text);else later(350,listen);return;}
  void advance(text);
 };
 r.onerror=e=>{
  if(rev!==revision||recognizer!==r)return;
  if(FATAL.includes(e?.error)){caption('Microfono non disponibile. Controlla il permesso del browser.');stop();return;}
  if(e?.error==='no-speech')return;
  failed=true;errors++;
 };
 r.onend=()=>{
  if(recognizer!==r)return;recognizer=null;
  if(rev!==revision||!voiceOn||running)return;
  if(failed)retry();else later(350,listen);
 };
 try{r.start();}catch{recognizer=null;r.onresult=r.onend=r.onerror=null;errors++;retry();return;}
 window.setState?.('idle','Ti ascolto','listen');
}
// After each reply the mic turns off: the presenter taps it again (or uses a key) for the next turn.
function micOff(){const was=voiceOn;voiceOn=false;dropRecognizer();errors=0;paint();if(was)window.setState?.('idle','Pronto','');}
function stop(){
 halt();voiceOn=false;window.shutUp?.();avatar('A');window.setState?.('idle','Pronto','');paint();
}
// Shared stop path: late callbacks of the current run no-op (revision), audio/timers/recognition end, a pending link is cancelled.
function halt(){
 revision++;running=false;errors=0;dropRecognizer();
 // A handover still waiting for its link: cancel it so no QR appears after Stop.
 if(handing){handing=false;void window.caseyHandoffCancel?.();}
 if(audio){const a=audio;audio=null;a.onended=a.onerror=null;try{a.pause();a.currentTime=0;}catch{}}
 for(const id of timers)clearTimeout(id);timers.clear();
 for(const res of [...pending])res(false);pending.clear();
}
// goIdle() is a no-op while a link is on screen; resetAll() cancels the link and clears the transcript.
function reset(){const active=!!window.caseyHandoffActive?.();stop();claimStep=null;setStep(0);if(active)window.resetAll?.();else window.goIdle?.();}
// Pre-recorded audio is Casey's only voice in demo mode: silence the browser TTS used by say().
window.speak=(_text,done)=>{if(done)done();};
window.send=custom=>{const input=$('q'),value=String(custom||input?.value||'').trim();if(!value)return;if(input){input.value='';input.blur?.();}return advance(value);};
window.toggleMic=()=>{unlockAudio();if(voiceOn||running){stop();return;}voiceOn=true;errors=0;paint();listen();};
window.toggleListen=()=>{if(voiceOn||running)stop();};
// A presenter key interrupts the current case (audio, silent fallback, QR issuance) and runs the requested one; the mic mode is kept.
function interrupt(i){if(running||handing){halt();window.shutUp?.();}claimStep=null;void runCase(i,S.steps[i]?.question||'');}
// Presenter keys (event.code, layout independent). Never while typing; nothing visible marks a key press.
const CASE_KEYS={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3};
const typing=t=>{const n=t||document.activeElement;if(n?.id==='q'&&!String(n.value||'').trim())return false;return !!n&&(/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName||'')||n.isContentEditable===true);};
document.addEventListener('keydown',e=>{
 if(e.code in CASE_KEYS||/^(Escape|Digit0|Numpad0|ArrowRight|PageDown)$/.test(e.code||''))unlockAudio();
 if(e.ctrlKey||e.metaKey||e.altKey||typing(e.target))return;
 const c=e.code;
 if(c==='Escape'||c==='Digit0'||c==='Numpad0'){e.preventDefault?.();reset();return;}
 let i=null;if(c in CASE_KEYS)i=CASE_KEYS[c];else if(c==='ArrowRight'||c==='PageDown'){const n=step();i=n<S.steps.length?n:-1;}
 if(i===null)return;e.preventDefault?.();if(e.repeat)return;
 interrupt(i);
});
window.addEventListener('casey:handoff-consumed',()=>{if(claimStep===null)return;const n=claimStep;claimStep=null;setStep(n+1);});
window.addEventListener('pagehide',()=>stop());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();});
// Demo identity comes only from the phone app; hide totem sign-in and account entry points.
// The demo phone runtime lives only in app-blu.html, so the Farm scenario is hidden and coerced to College.
const hideSignIn=()=>{for(const n of document.querySelectorAll('#settingsLink,#appLink,#tryCaseyLink,#caseyPasswordForm,#sc-FARM,.presentation-tools a[href^="settings.html"]'))n.hidden=true;};
const scenario=window.setScenario;if(typeof scenario==='function')window.setScenario=s=>scenario(s==='FARM'?'COLLEGE':s);
// No Gemini paths in demo: Live tool calls on the totem cannot classify, search knowledge or issue a QR.
const unavailable=async()=>({status:'unavailable_in_demo',note:'Demo mode: no live tools.'});
window.CaseyBridge=Object.freeze({liveMobileHandoff:unavailable,liveSearchKnowledge:unavailable});
hideSignIn();document.addEventListener('DOMContentLoaded',hideSignIn);
// Preload the case audio once and keep it in memory; a discreet dot on the status pill marks all files ready.
// A missing file keeps the text fallback in playLine().
const clips=new Map();let ready=0;
function markReady(){if(++ready<clips.size)return;const pill=$('bePill');if(pill){pill.dataset&&(pill.dataset.demoAudio='ready');const dot=pill.querySelector?.('i');if(dot?.style)dot.style.boxShadow='0 0 0 2px #22c55e';}}
for(const l of [...S.steps.flatMap(x=>x.totem),S.fallback]){if(clips.has(l.audio))continue;let a=null;try{a=new Audio(l.audio);a.preload='auto';let counted=false;a.oncanplaythrough=()=>{if(!counted){counted=true;markReady();}};a.load?.();}catch{a=null;}clips.set(l.audio,a);}
// First user gesture: play/pause every preloaded clip muted so later play() calls are allowed by the autoplay policy.
let unlocked=false;
function unlockAudio(force){
 if(unlocked&&!force)return Promise.resolve();unlocked=true;
 return Promise.all([...clips.values()].filter(a=>a&&a!==audio).map(a=>{try{a.muted=true;const p=a.play();
  const reset=()=>{if(audio===a){a.muted=false;return;}try{a.pause();a.currentTime=0;}catch{}a.muted=false;};
  return Promise.resolve(p).then(reset,reset);}catch{a.muted=false;return null;}}));
}
document.addEventListener('pointerdown',()=>{void unlockAudio();});
function clip(src){const a=clips.get(src);if(a)return a;try{return new Audio(src);}catch{return null;}}
window.CaseyDemo=Object.freeze({active:true,step,stop,advance,runCase,reset,audioReady:()=>clips.size>0&&ready>=clips.size});
})();
