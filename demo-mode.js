/* Totem live demo (?demo=1): ordered script, browser speech with live subtitles, pre-recorded audio.
   Only handover() is real. No turn/classify/knowledge/Live calls; without ?demo=1 this file does nothing. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('demo')!=='1')return;
const S=window.CaseyDemoScript;if(!S)return;
// CASEY_CONFIG is frozen: publish a frozen superset. Later scripts read the new object; earlier ones must read window.CASEY_CONFIG at call time.
window.CASEY_CONFIG=Object.freeze({...(window.CASEY_CONFIG||{}),demoActive:true,demoAppBase:location.origin+'/'});
const KEY='casey-demo-step',timers=new Set(),pending=new Set();
let revision=0,running=false,voiceOn=false,recognizer=null,audio=null;
const $=id=>document.getElementById(id);
const avatar=k=>window.setAvatarState?.(k);
const caption=t=>{const p=$('capText');if(p)p.textContent=t;};
function step(){const n=parseInt(sessionStorage.getItem(KEY)||'0',10);return Number.isInteger(n)&&n>0?Math.min(n,S.steps.length):0;}
const setStep=n=>sessionStorage.setItem(KEY,String(n));
function later(ms,fn){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
function wait(ms,rev){return new Promise(res=>{pending.add(res);later(ms,()=>{pending.delete(res);res(rev===revision);});});}
function paint(){const mic=$('micBtn');if(!mic)return;const on=voiceOn||running;mic.classList.toggle('on',on);const label=on?'Ferma Casey':'Parla con Casey';mic.setAttribute('aria-label',label);mic.title=label;}
function dropRecognizer(){const r=recognizer;recognizer=null;if(r){r.onresult=r.onend=r.onerror=null;try{r.abort();}catch{}}}
// Resolves true when the line finished in this revision; false if stopped meanwhile.
function playLine(line,rev){
 if(rev!==revision)return Promise.resolve(false);
 const text=S.render(line.text);window.say(text);window.CaseyDialogue?.append('assistant',text);avatar('C');
 return new Promise(resolve=>{
  let done=false,silent=false,a=null;
  const finish=ok=>{if(done)return;done=true;pending.delete(finish);if(audio===a)audio=null;resolve(ok&&rev===revision);};
  pending.add(finish);
  const fallback=()=>{if(done||silent||rev!==revision)return;silent=true;if(audio===a)audio=null;avatar('C');later(Math.max(2000,text.length*55),()=>finish(true));};
  try{a=new Audio(line.audio);}catch{a=null;}
  if(!a){fallback();return;}
  audio=a;a.onended=()=>{if(rev===revision&&!silent)finish(true);};a.onerror=fallback;
  try{const p=a.play();p?.catch?.(fallback);}catch{fallback();}
 }).then(ok=>{if(ok)avatar('A');return ok;});
}
async function advance(text){
 if(running)return;
 const rev=revision,i=step(),current=S.steps[i]||null,said=String(text||'').trim()||current?.question||'';
 running=true;dropRecognizer();paint();
 try{
  if(said){window.CaseyDialogue?.append('user',said);caption(said);}
  avatar('E');if(!await wait(700,rev))return;
  for(const line of current?current.totem:[S.fallback])if(!await playLine(line,rev))return;
  if(!current)return;
  setStep(i+1);
  if(current.handoff)await window.handover?.(undefined,current.handoff.intent);
 }finally{if(rev===revision){running=false;paint();if(voiceOn)later(300,listen);}}
}
function listen(){
 if(!voiceOn||running||recognizer)return;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){caption('La voce non è disponibile in questo browser. Puoi continuare a scrivere.');stop();return;}
 const rev=revision,r=new SR();recognizer=r;r.lang='it-IT';r.interimResults=true;r.continuous=false;
 r.onresult=e=>{
  if(rev!==revision||recognizer!==r)return;let text='',final=false;
  for(let k=0;k<e.results.length;k++){text+=e.results[k][0]?.transcript||'';if(e.results[k].isFinal)final=true;}
  text=text.trim();if(!text)return;caption(text);
  if(final){dropRecognizer();void advance(text);}
 };
 r.onend=()=>{if(recognizer!==r)return;recognizer=null;if(rev===revision&&voiceOn&&!running)later(350,listen);};
 r.onerror=e=>{if(rev===revision&&['not-allowed','service-not-allowed','audio-capture'].includes(e?.error)){caption('Microfono non disponibile. Controlla il permesso del browser.');stop();}};
 try{r.start();}catch{/* Already listening. */}
 window.setState?.('idle','Ti ascolto','listen');
}
function stop(){
 revision++;voiceOn=false;running=false;dropRecognizer();
 if(audio){const a=audio;audio=null;a.onended=a.onerror=null;try{a.pause();a.currentTime=0;}catch{}}
 for(const id of timers)clearTimeout(id);timers.clear();
 for(const res of [...pending])res(false);pending.clear();
 window.shutUp?.();paint();
}
function reset(){stop();setStep(0);window.goIdle?.();}
// Pre-recorded audio is Casey's only voice in demo mode: silence the browser TTS used by say().
window.speak=(_text,done)=>{if(done)done();};
window.send=custom=>{const input=$('q'),value=String(custom||input?.value||'').trim();if(!value)return;if(input)input.value='';return advance(value);};
window.toggleMic=()=>{if(voiceOn||running){stop();return;}voiceOn=true;paint();listen();};
window.toggleListen=()=>{if(voiceOn||running)stop();};
document.addEventListener('keydown',e=>{
 if(!e.shiftKey)return;
 if(e.key==='ArrowRight'){e.preventDefault();if(running)return;void advance(S.steps[step()]?.question||'');}
 else if(e.key==='Backspace'){e.preventDefault();reset();}
});
// Demo identity comes only from the phone app; hide totem sign-in and account entry points.
const hideSignIn=()=>{for(const n of document.querySelectorAll('#settingsLink,#appLink,#tryCaseyLink,#caseyPasswordForm,.presentation-tools a[href^="settings.html"]'))n.hidden=true;};
hideSignIn();document.addEventListener('DOMContentLoaded',hideSignIn);
window.CaseyDemo=Object.freeze({active:true,step,stop,advance,reset});
})();
