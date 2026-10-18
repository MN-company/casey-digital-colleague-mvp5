/* Casey Live 5.2 - native audio over ephemeral-token Gemini Live WebSocket.
   Prototype ONLY: no calendar/Gmail tools are advertised or executed. */
(() => {
 'use strict';
 const API='https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-live-token';
 const WS='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=';
 let socket=null, stream=null, context=null, mic=null, processor=null, silent=null;
 let active=false, paused=false, ready=false, outputAt=0, scheduled=new Set(), generation=0, starting=false;
 const $=id=>document.getElementById(id);
 const status=(s)=>{const e=$('caseyLiveStatus');if(e)e.textContent=s;};
 const display=(s)=>{const e=$('subtitleBox');if(e)e.textContent=s;};
 function avatar(s){try{if(typeof window.setAvatarState==='function')window.setAvatarState(s);}catch{}}
 function token(){try{let item=JSON.parse(sessionStorage.getItem('casey-original-ui-session')||'null');return item?.exp>Date.now()+1000?item.token:null;}catch{return null;}}
 function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x4000)s+=String.fromCharCode(...bytes.subarray(i,i+0x4000));return btoa(s);}
 function decode64(s){let str=atob(s),out=new Uint8Array(str.length);for(let i=0;i<str.length;i++)out[i]=str.charCodeAt(i);return out;}
 function pcm16(float,rate){const ratio=rate/16000;const length=Math.floor(float.length/ratio);const bytes=new Uint8Array(length*2);const view=new DataView(bytes.buffer);for(let i=0;i<length;i++){const source=Math.min(float.length-1,Math.floor(i*ratio));const x=Math.max(-1,Math.min(1,float[source]));view.setInt16(i*2,x<0?x*32768:x*32767,true);}return bytes;}
 function stopAudio(){for(const source of scheduled){try{source.stop();}catch{}}scheduled.clear();outputAt=0;}
 function play(data,mime){if(!context||!active||paused)return;const sampleRate=Number(/rate=(\d+)/.exec(mime||'')?.[1]||24000);const raw=decode64(data);if(raw.length<2)return;const pcm=new Float32Array(Math.floor(raw.length/2));const dv=new DataView(raw.buffer);for(let i=0;i<pcm.length;i++)pcm[i]=dv.getInt16(i*2,true)/32768;const buf=context.createBuffer(1,pcm.length,sampleRate);buf.copyToChannel(pcm,0);const source=context.createBufferSource();source.buffer=buf;source.connect(context.destination);const t=Math.max(context.currentTime+0.04,outputAt);source.start(t);outputAt=t+buf.duration;scheduled.add(source);source.onended=()=>{scheduled.delete(source);if(!scheduled.size&&active)avatar('LISTEN');};avatar('C');}
 function onmessage(event){let msg;try{msg=JSON.parse(event.data);}catch{return;}if(msg.setupComplete){ready=true;status('In ascolto');avatar('LISTEN');return;}
  const content=msg.serverContent;if(content){if(content.interrupted){stopAudio();avatar('LISTEN');}if(content.inputTranscription?.text)status('Tu: '+content.inputTranscription.text);if(content.outputTranscription?.text){display(content.outputTranscription.text);status('Casey parla');}
   for(const part of content.modelTurn?.parts||[]){if(part.inlineData?.data)play(part.inlineData.data,part.inlineData.mimeType);}
   if(content.turnComplete&&!scheduled.size){status('In ascolto');avatar('LISTEN');}
  }
  if(msg.goAway){status('Sessione in scadenza: riavvia Live');}
  // No tools are exposed to this prototype. Never execute tool calls here.
 }
 async function stop(){generation++;active=false;starting=false;ready=false;paused=false;try{socket?.close();}catch{}socket=null;stopAudio();try{processor?.disconnect();mic?.disconnect();silent?.disconnect();}catch{}processor=mic=silent=null;for(const t of stream?.getTracks()||[])t.stop();stream=null;try{await context?.close();}catch{}context=null;avatar('A');status('Live disattivato');render();}
 function render(){const b=$('caseyLiveBtn'),p=$('caseyLivePause');if(b){b.textContent=active?'Termina Live':'Avvia Live';b.disabled=starting;}if(p){p.hidden=!active;p.textContent=paused?'Riprendi ascolto':'Pausa';}}
 async function start(){if(active||starting)return;starting=true;const mine=++generation;render();status('Connessione...');try{
  const session=token();if(!session)throw new Error('Apri prima una sessione Casey: ricarica la pagina e riprova.');
  const lang=window.CaseyVoice?.getLanguage?.()||'it-IT';
  const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':session},body:JSON.stringify({language:lang}),signal:AbortSignal.timeout(12000)});
  const meta=await res.json();if(!res.ok)throw new Error(meta.error||`Token HTTP ${res.status}`);
  if(mine!==generation)return;
  // Permission prompt happens as result of explicit user activation; only request mic after token is available.
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  context=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
  socket=new WebSocket(WS+encodeURIComponent(meta.token));
  socket.onopen=()=>{if(mine!==generation)return;socket.send(JSON.stringify({setup:{model:'models/'+meta.model,...meta.config}}));};
  socket.onmessage=onmessage;
  socket.onerror=()=>{status('Connessione Live non riuscita; usa Casey Standard');};
  socket.onclose=()=>{if(mine===generation&&active){status('Connessione Live chiusa');stop();}};
  mic=context.createMediaStreamSource(stream);
  // Browser-compatible prototype; upgrade to AudioWorklet for production.
  processor=context.createScriptProcessor(2048,1,1);
  silent=context.createGain();silent.gain.value=0;mic.connect(processor);processor.connect(silent);silent.connect(context.destination);
  processor.onaudioprocess=(ev)=>{if(!active||!ready||paused||!socket||socket.readyState!==WebSocket.OPEN)return;if(socket.bufferedAmount>400000)return;const f=ev.inputBuffer.getChannelData(0);const pcm=pcm16(f,context.sampleRate);socket.send(JSON.stringify({realtimeInput:{audio:{data:base64(pcm),mimeType:'audio/pcm;rate=16000'}}}));};
  active=true;starting=false;status('Inizializzazione audio...');render();
 }catch(err){console.warn('Casey Live:',err);await stop();status('Live non disponibile: '+(err?.message||'errore')+' — Casey Standard rimane attivo.');}}
 function pause(){if(!active)return;paused=!paused;stopAudio();if(socket?.readyState===WebSocket.OPEN&&paused)socket.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));status(paused?'Microfono in pausa':'In ascolto');avatar(paused?'A':'LISTEN');render();}
 function toggle(){if(active)return stop();return start();}
 document.addEventListener('DOMContentLoaded',render);
 window.CaseyLive=Object.freeze({toggle,pause,stop,get active(){return active;}});
})();
