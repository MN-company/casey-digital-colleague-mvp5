(() => {
 'use strict';const A=window.HandoffAPI,C=window.CASEY_CONFIG,$=id=>document.getElementById(id);
 const params=new URLSearchParams(location.hash.slice(1));let handoff=params.get('handoff')||sessionStorage.getItem('casey-handoff-v2-pending')||'';
 history.replaceState(null,'',location.pathname);if(/^[a-f0-9]{64}$/.test(handoff))sessionStorage.setItem('casey-handoff-v2-pending',handoff);else handoff='';
 let version=0,loading=true,busy=false,saveTimer=null,queue=Promise.resolve(),saved='',handoffCount=0,lastRequest='',liveDraft=null;
 function notice(text){$('chatStatus').textContent=text;$('collegeStatus').textContent=text;}
 function expired(){notice('Accedi di nuovo per continuare. I messaggi restano salvati.');$('reloginButton').hidden=false;}
 function renderLogin(){const signed=!!A.auth();$('loginCard').hidden=signed;$('resumeCard').hidden=!signed;$('resumeButton').hidden=!sessionStorage.getItem('casey-handoff-v2-chat-id');}
 function bubble(role,text){const node=document.createElement('div');node.className='chat-message '+role;const label=document.createElement('small');label.textContent=role==='user'?'Tu':'Casey';const body=document.createElement('span');body.textContent=text;node.append(label,body);return node;}
 function renderMessages(){const list=$('chatMessages'),atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<100;list.replaceChildren();const turns=CaseyDialogue.snapshot();turns.forEach((t,i)=>{list.append(bubble(t.role,t.text));if(i===handoffCount-1){const line=document.createElement('div');line.className='chat-divider';line.textContent='Conversazione ripresa dal totem';list.append(line);}});liveDraft=null;if(atBottom||loading)list.scrollTop=list.scrollHeight;}
 function persist(){
  const run=queue.catch(()=>{}).then(async()=>{if(loading)return;const snapshot=CaseyDialogue.snapshot(),value=JSON.stringify(snapshot);if(value===saved)return;
   if(!A.auth()){expired();throw new Error('Accesso scaduto');}
   $('saveStatus').textContent='Salvataggio…';const result=await A.call('save',{context:snapshot,version});version=result.version;saved=value;$('saveStatus').textContent='Conversazione salvata';});
  queue=run;run.catch(err=>{$('saveStatus').textContent='Salvataggio non riuscito. '+err.message;});return run;
 }
 window.addEventListener('casey:dialogue',()=>{if(loading)return;renderMessages();clearTimeout(saveTimer);saveTimer=setTimeout(()=>void persist().catch(()=>{}),250);});
 async function enter(data){loading=true;version=data.version;handoffCount=data.context.length;sessionStorage.setItem('casey-handoff-v2-chat-id',data.chat_id);CaseyDialogue.clear();for(const t of data.context)CaseyDialogue.append(t.role,t.text);saved=JSON.stringify(CaseyDialogue.snapshot());handoff='';sessionStorage.removeItem('casey-handoff-v2-pending');document.body.classList.add('in-session');$('loginCard').hidden=true;$('resumeCard').hidden=true;$('conversation').hidden=false;$('accountLabel').textContent=A.auth()?.email||'Account College';renderMessages();loading=false;notice('La stessa conversazione, ora sul tuo telefono.');$('saveStatus').textContent='Conversazione salvata';$('reloginButton').hidden=true;}
 async function continueChat(){renderLogin();if(!A.auth())return;notice('Apro la tua conversazione…');try{
   if(handoff){const data=await A.call('claim',{token:handoff});A.saveSession(data.session_token);await enter(data);}
   else if(sessionStorage.getItem('casey-handoff-v2-chat-id')){let data;try{data=await A.call('load');}catch{data=await A.call('restore');A.saveSession(data.session_token);}await enter(data);}
   else notice('Scansiona il QR del totem per riprendere la conversazione.');
  }catch(err){notice(err.message);renderLogin();}}
 $('collegeLogin').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;notice('Accesso in corso…');try{const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value.trim(),password:$('password').value}),signal:AbortSignal.timeout(16000)});const d=await r.json();if(!r.ok||!d.access_token)throw new Error('Email o password non valide');sessionStorage.setItem(A.authKey,JSON.stringify({access_token:d.access_token,email:d.user.email,expires_at:Date.now()+d.expires_in*1000}));$('password').value='';await continueChat();}catch(err){notice(err.message);}finally{button.disabled=false;}};
 $('resumeButton').onclick=continueChat;
 async function send(text){if(busy||!text.trim())return;if(!A.auth()){expired();return;}lastRequest=text.trim();$('retryButton').hidden=true;busy=true;$('sendButton').disabled=true;
  try{if(CaseyLive.active){if(!CaseyLive.ready)throw new Error('Attendi la connessione vocale oppure termina la voce e scrivi.');CaseyLive.sendText(lastRequest);$('chatInput').value='';return;}
   CaseyDialogue.append('user',lastRequest);$('chatInput').value='';await persist();notice('Casey sta rispondendo…');
   const result=await A.call('chat_turn');CaseyDialogue.append('assistant',result.answer);await persist();notice('');
  }catch(err){notice(/timeout|timed out/i.test(err.message)?'Casey sta impiegando più tempo del previsto. La conversazione è salvata: puoi riprovare.':err.message);$('retryButton').hidden=false;}finally{busy=false;$('sendButton').disabled=false;}}
 $('chatForm').onsubmit=e=>{e.preventDefault();void send($('chatInput').value);};$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();void send($('chatInput').value);}};
 $('retryButton').onclick=()=>void send(lastRequest);
 $('caseyLiveBtn').onclick=async()=>{if(!A.auth()){expired();return;}if(busy)return;try{await persist();if(CaseyLive.active)await CaseyLive.stop('Voce terminata. Puoi continuare a scrivere.');else await CaseyLive.start();}catch(err){notice(err.message);}};
 $('caseyLivePause').onclick=()=>CaseyLive.pause();
 new MutationObserver(()=>{const text=$('subtitleBox').textContent;if(!text)return;if(!liveDraft){liveDraft=bubble('assistant','');liveDraft.dataset.streaming='true';$('chatMessages').append(liveDraft);}liveDraft.querySelector('span').textContent=text;$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}).observe($('subtitleBox'),{childList:true,characterData:true,subtree:true});
 new MutationObserver(()=>{const text=$('caseyLiveStatus').textContent;if(/non disponibile|quota|credit|microfono|Microfono|Errore|negat/i.test(text))notice(text);}).observe($('caseyLiveStatus'),{childList:true,subtree:true});
 $('reloginButton').onclick=()=>{document.body.classList.remove('in-session');$('conversation').hidden=true;sessionStorage.removeItem(A.authKey);renderLogin();};
 $('logoutButton').onclick=async()=>{try{await persist();}catch{}await CaseyLive.stop();const a=A.auth();sessionStorage.removeItem(A.authKey);sessionStorage.removeItem(A.sessionKey);CaseyDialogue.clear();document.body.classList.remove('in-session');$('conversation').hidden=true;renderLogin();notice('Account disconnesso.');if(a)await fetch(C.supabaseUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:C.publishableKey,Authorization:'Bearer '+a.access_token}}).catch(()=>{});};
 $('clearButton').onclick=async()=>{if(!confirm('Eliminare questa conversazione?'))return;try{await queue.catch(()=>{});await A.call('clear');await CaseyLive.stop();sessionStorage.removeItem('casey-handoff-v2-chat-id');CaseyDialogue.clear();loading=true;document.body.classList.remove('in-session');$('conversation').hidden=true;renderLogin();notice('Conversazione eliminata.');}catch(err){notice(err.message);}};
 // Tool adapters reuse the existing Casey endpoints; no external action can commit from a model call.
 async function api(action,body={}){const r=await fetch(C.apiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':A.session(),'x-student-token':A.auth()?.access_token||''},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(16000)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Operazione non disponibile');return d;}
 window.CaseyBridge={liveMobileHandoff:()=>({status:'already_on_mobile'}),liveFindSlots:args=>api('slots',args),liveSearchKnowledge:query=>api('knowledge_lookup',{query}),liveBookingStatus:id=>api('operation_status',{request_id:id}),livePrepareBooking:()=>({status:'unavailable',message:'Questa Preview non esegue prenotazioni esterne. Possiamo preparare la richiesta nella conversazione.'})};
 renderLogin();void continueChat();
})();
