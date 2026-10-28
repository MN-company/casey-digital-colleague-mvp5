(() => {
 'use strict';const C=window.CASEY_CONFIG,A=window.HandoffAPI;
 let engine='',sessionPromise=null,revision=0,link=null,phoneUrl='',poll=null,expiry=null,busy=false;
 const messages=window.CaseyDialogue;
 const text={
 'it-IT':{ready:'Preview · collegato',thinking:'Cerco nelle fonti…',transfer:'Continuiamo sul telefono: lì puoi accedere e ritrovare la conversazione.',expired:'QR scaduto. Chiedi di continuare sul telefono per generarne uno nuovo.',error:'Collegamento non disponibile. Riprova tra poco.',candidate:'Documento non confermato',verified:'Documento verificato',scope:'Farm è una dimostrazione grafica. Le risposte collegate riguardano College.',welcome:'Ciao, sono Casey. Come posso aiutarti?',placeholder:'Scrivi a Casey…'},
 'en-US':{ready:'Preview · connected',thinking:'Searching the sources…',transfer:'Let’s continue on your phone, where you can sign in and resume this conversation.',expired:'QR expired. Ask to continue on your phone to generate a new one.',error:'Connection unavailable. Please try again.',candidate:'Document awaiting validation',verified:'Verified document',scope:'Farm is a visual demo. Connected answers cover College.',welcome:'Hi, I’m Casey. How can I help?',placeholder:'Message Casey…'},
 'es-ES':{ready:'Preview · conectado',thinking:'Busco en las fuentes…',transfer:'Continuamos en tu teléfono: allí puedes iniciar sesión y retomar la conversación.',expired:'QR caducado. Pide continuar en tu teléfono para generar otro.',error:'Conexión no disponible. Inténtalo de nuevo.',candidate:'Documento pendiente de validación',verified:'Documento verificado',scope:'Farm es una demostración visual. Las respuestas conectadas cubren College.',welcome:'Hola, soy Casey. ¿Cómo puedo ayudarte?',placeholder:'Escribe a Casey…'}
 };
 const t=()=>text[CaseyLanguage.get()];
 const status=message=>{const el=document.querySelector('#bePill span');if(el)el.textContent=message;};
 async function call(action,body={},renew=true){
 const r=await fetch(C.apiUrl,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.publishableKey,'x-session-token':engine},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(28000)});const d=await (window.CaseyErrors?.json(r)||r.json());if(!r.ok){if(r.status===401&&renew&&action!=='session'){engine='';sessionPromise=null;await session();return call(action,body,false);}throw Object.assign(Error(d.error||t().error),{status:r.status});}return d;
 }
 async function session(){if(engine)return engine;if(!sessionPromise)sessionPromise=call('session').then(d=>engine=d.token).finally(()=>sessionPromise=null);return sessionPromise;}
 function stopPoll(){clearInterval(poll);clearTimeout(expiry);poll=expiry=null;}
 async function clearLink(){stopPoll();const old=link;link=null;phoneUrl='';document.getElementById('qrCard').classList.remove('on');if(old){await A.call('cancel',{id:old}).catch(()=>{});}document.getElementById('qrCard').classList.remove('on');}
 const visualSay=window.say;
 window.say=(value,source,kind,label,end)=>{if(window.CaseyLive?.active){showSilent(value,source);return;}visualSay(value,source,kind,label,end);clearInterval(capTimer);document.getElementById('capText').textContent=value;};
 async function handover(note,intent){
  // Showing a QR is a visual tool result, not a voice-session teardown.
  const rev=revision;await clearLink();if(rev!==revision)return;
  const card=document.getElementById('qrCard');card.classList.remove('expired');card.classList.add('on');document.getElementById('qrMeta').textContent=t().thinking;
  try{
   const r=await A.call('issue',{context:messages.snapshot()});
   if(rev!==revision){await A.call('cancel',{id:r.id}).catch(()=>{});return;}
   link=r.id;const url=new URL((S==='FARM'?'app-rossa.html':'app-blu.html')+'?casey=1',location.href);url.searchParams.set('lang',CaseyLanguage.get());if(intent==='badge')url.searchParams.set('intent','badge');url.hash='handoff='+r.token;phoneUrl=url.href;
   const code=qrcode(0,'M');code.addData(url.href);code.make();const n=code.getModuleCount(),svg=document.getElementById('qrCode');svg.setAttribute('viewBox','-4 -4 '+(n+8)+' '+(n+8));let path='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(code.isDark(y,x))path+='M'+x+' '+y+'h1v1h-1z';svg.innerHTML='<rect x="-4" y="-4" width="'+(n+8)+'" height="'+(n+8)+'" fill="white"/><path d="'+path+'" fill="#101828" shape-rendering="crispEdges"/>';

   document.getElementById('qrTitle').textContent=S==='FARM'?'Casey · Campus':'Casey · College';document.getElementById('qrSub').textContent=typeof note==='string'?note:t().transfer;
   const until=Date.now()+r.expires_in*1000;const tick=()=>{document.getElementById('qrMeta').textContent=Math.max(0,Math.ceil((until-Date.now())/1000))+' s · uso singolo';};tick();
   say(typeof note==='string'?note:t().transfer,null,'pr','Privacy','hand');
   let checking=false;poll=setInterval(async()=>{if(checking||link!==r.id)return;checking=true;tick();try{const state=await A.call('status',{id:r.id});if(link!==r.id)return;if(state.consumed){await window.CaseyVoiceSession?.stop();stopPoll();link=null;messages.clear();engine='';sessionPromise=null;revision++;document.getElementById('qrCard').classList.remove('on');goIdle();}else if(state.expired){stopPoll();link=null;phoneUrl='';document.getElementById('qrCode').replaceChildren();card.classList.add('expired');document.getElementById('qrMeta').textContent=t().expired;}}catch{status(t().error);}finally{checking=false;}},2500);
   expiry=setTimeout(()=>{if(link!==r.id)return;stopPoll();link=null;phoneUrl='';document.getElementById('qrCode').replaceChildren();card.classList.add('expired');document.getElementById('qrMeta').textContent=t().expired;},r.expires_in*1000);
   return {status:'handoff_ready',expires_in:r.expires_in};
  }catch(e){card.classList.add('expired');document.getElementById('qrMeta').textContent=window.CaseyErrors?.message(e)||t().error;}
 }
 window.handover=handover;window.openSession=handover;window.openPhone=()=>{if(phoneUrl&&link)window.open(phoneUrl,'_blank','noopener');};
 // Remove simulated routing, tickets and booking outcomes from the connected path.
 window.send=async custom=>{
  const input=document.getElementById('q'),value=String(custom||input.value||'').trim();if(!value||busy)return;if(value.length>1000){showSilent('Scrivi un messaggio entro 1.000 caratteri.');return;}
  input.value='';if(window.CaseyLive?.active&&window.CaseyLive.ready){window.CaseyLive.sendText(value);return;}busy=true;const rev=revision,before=messages.snapshot();shutUp();const wait=setTimeout(()=>{if(busy&&rev===revision){document.getElementById('capText').textContent='Sto ancora cercando nelle fonti…';}},6000);
  try{
   messages.append('user',value);setState('think',t().thinking,'think');
   const campus=await window.CaseyCampusCases?.handle(value);if(rev!==revision)return;if(campus?.matched){messages.append('assistant',campus.answer);say(campus.answer,campus.citations?.map(x=>x.title+' · p. '+x.page).join(' · ')||null,'tra','Fonte verificata','point');return campus.answer;}
   const route=await A.call('classify',{message:value});if(rev!==revision)return;
   if(route.route!=='public'){await handover();return;}
   await session();const history=messages.snapshot().slice(0,-1);const r=await call('turn',{message:value,history,language:CaseyLanguage.get()});if(rev!==revision)return;
   messages.append('assistant',r.answer);say(r.answer,r.citations?.map(x=>x.title+(x.page?' · p. '+x.page:'')).join(' · ')||null,r.source_status==='candidate'?'nc':'tra',r.source_status==='candidate'?t().candidate:t().verified,'point');status(t().ready);return r.answer;
  }catch(e){if(rev===revision){messages.replace(before);const message=window.CaseyErrors?.message(e)||t().error;showSilent(message);status(t().error);}}
  finally{clearTimeout(wait);busy=false;}
 };
 const oldIdle=window.goIdle;
 window.goIdle=()=>{if(link)return;revision++;messages.clear();engine='';void clearLink();oldIdle();};
 const reset=window.resetAll;window.resetAll=()=>{revision++;messages.clear();engine='';void clearLink();reset();};
 const scenario=window.setScenario;window.setScenario=s=>{revision++;messages.clear();engine='';void clearLink();scenario(s);};
 window.addEventListener('casey:language',()=>{revision++;shutUp();document.getElementById('q').placeholder=t().placeholder;status(t().ready);say(t().welcome);});
 window.addEventListener('casey:service-case',event=>{if(['checkin','internship_contract'].includes(event.detail?.case))void clearLink();});
 // Back-office action controls are demonstrations; label them persistently.
 window.CaseyBridge={liveMobileHandoff:async()=>{const latest=messages.snapshot().filter(t=>t.role==='user').at(-1)?.text||'';if(!latest)return {status:'clarification_required',note:'Ask a short clarification here. Do not suggest QR for uncertainty or missing sources.'};const decision=await A.call('classify',{message:latest});if(decision.route==='public')return {status:'public_question',note:'Continue answering here. For public procedures search verified knowledge; if needed ask which course. Do not propose a QR.'};return handover();},liveSearchKnowledge:async query=>{await session();return call('knowledge_lookup',{query,history:messages.snapshot().slice(-10),language:CaseyLanguage.get()});}};
 status(t().ready);document.getElementById('q').placeholder=t().placeholder;
})();
