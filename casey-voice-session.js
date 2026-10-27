/* One voice session owner: Gemini Live first, speech-to-text + AI + speech fallback. */
(() => {
 'use strict';let state='idle',wanted=false,revision=0,recognizer=null,restart=null,options={},inputMicrophone=true;
 const emit=value=>{state=value;window.dispatchEvent(new CustomEvent('casey:voice',{detail:{state}}));};
 function clearFallback(){clearTimeout(restart);restart=null;if(recognizer){recognizer.onresult=recognizer.onend=recognizer.onerror=null;try{recognizer.abort();}catch{}recognizer=null;}window.speechSynthesis?.cancel();}
 async function stop(){wanted=false;++revision;clearFallback();await window.CaseyLive?.stop();emit('idle');}
 function speak(text,mine){return new Promise(resolve=>{if(!wanted||mine!==revision||!text||!window.speechSynthesis){resolve();return;}const utterance=new SpeechSynthesisUtterance(text);utterance.lang=window.CaseyLanguage?.get()||'it-IT';utterance.onend=utterance.onerror=resolve;speechSynthesis.cancel();speechSynthesis.speak(utterance);});}
 async function fallback(mine){
  if(!wanted||mine!==revision)return;
  if(!inputMicrophone){options.notice?.('La voce non è disponibile in questo momento. Puoi continuare a scrivere.');await stop();return;}await window.CaseyLive?.stop();if(!wanted||mine!==revision)return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){options.notice?.('La voce non è disponibile in questo browser. Puoi continuare a scrivere.');await stop();return;}
  emit('fallback');let processing=false;recognizer=new SR();recognizer.lang=window.CaseyLanguage?.get()||'it-IT';recognizer.interimResults=false;recognizer.continuous=false;
  const listen=()=>{if(!wanted||mine!==revision||processing||!recognizer)return;try{recognizer.start();}catch{/* Already listening. */}};
  recognizer.onresult=async e=>{
   const text=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim();if(!text||processing||!wanted)return;processing=true;try{recognizer?.stop();}catch{}
   emit('responding');try{const answer=await options.send(text);if(wanted&&mine===revision)await speak(answer,mine);}catch{options.notice?.('Non riesco a rispondere in questo momento.');}
   finally{processing=false;if(wanted&&mine===revision){emit('fallback');restart=setTimeout(listen,300);}}
  };
  recognizer.onend=()=>{if(wanted&&mine===revision&&!processing)restart=setTimeout(listen,350);};
  recognizer.onerror=e=>{if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){options.notice?.('Microfono non disponibile. Controlla il permesso del browser.');void stop();}};
  listen();
 }
 async function start({microphone=true}={}){
  if(wanted){await stop();return;}wanted=true;inputMicrophone=microphone;const mine=++revision;emit('connecting');
  try{
   await options.prepare?.();if(!wanted||mine!==revision)return;
   window.CaseyLive?.setMuted(false);await window.CaseyLive.start({microphone});
   const until=Date.now()+17000;while(wanted&&mine===revision&&window.CaseyLive.active&&!window.CaseyLive.ready&&Date.now()<until)await new Promise(r=>setTimeout(r,100));
   if(!wanted||mine!==revision)return;if(window.CaseyLive.ready){emit('live');return;}
  }catch{/* Fallback keeps the same conversation and stop control. */}
  await fallback(mine);
 }
 window.addEventListener('casey:live-state',event=>{if(wanted&&state==='live'&&event.detail.state==='idle')void fallback(revision);});
 window.addEventListener('pagehide',()=>{void stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void stop();});
 window.CaseyVoiceSession=Object.freeze({configure(value){options=value;},start,stop,stopForText:async()=>{if(state==='live'||state==='connecting')await stop();},get state(){return state;}});
 // college.js exports its existing authenticated send path. Text itself never starts a voice connection.
 if(location.pathname.endsWith('/college.html'))window.CaseyVoiceSession.configure({send:text=>window.CaseySendText(text),prepare:async()=>{await window.HandoffAPI.refresh();if(!HandoffAPI.auth())throw Error('Sign in');},notice:text=>{const el=document.getElementById('chatStatus');if(el)el.textContent=text;}});
})();
