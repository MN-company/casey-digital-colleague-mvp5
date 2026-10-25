/* OAuth admin console: access token appears only in URL fragment briefly, then in sessionStorage. */
(() => {
 'use strict';
 const $ = id=>document.getElementById(id), API=window.CASEY_CONFIG.settingsApiUrl||window.CASEY_CONFIG.apiUrl;
 const key='casey-v3-admin';

 // Do not leave Student Office access open on a shared demonstrator.
 let adminIdleTimer=null;
 function restartAdminIdle(){
  if(adminIdleTimer)clearTimeout(adminIdleTimer);
  adminIdleTimer=setTimeout(async()=>{
   const oldToken=token;
   if(oldToken){try{await call('admin_logout');}catch{}}
   token=null;
   try{sessionStorage.removeItem(key);}catch{}
   signed(false);
   banner('Accesso Student Office chiuso per inattività. Ricollega l’account per proseguire.','bad');
  },600000);
 }

 const GOOGLE_OAUTH_API=API;
 const redirectUri=window.location.origin+window.location.pathname;
 const startUrl=`${GOOGLE_OAUTH_API}/oauth/start?return_to=${encodeURIComponent(redirectUri)}`;
 let token=null;
 function banner(message,variant=''){const box=$('globalStatus');box.textContent=message;box.className='settings-alert '+variant;}
 async function call(action,values={}){
  const res=await fetch(API,{method:'POST',headers:{'content-type':'application/json',...(token?{'x-admin-token':token}:{})},body:JSON.stringify({action,...values}),signal:AbortSignal.timeout(26000)});
  const data=await res.json().catch(()=>({error:'Risposta API non valida'}));if(!res.ok){const err=new Error(data.error||'Errore HTTP '+res.status);err.status=res.status;throw err;}return data;
 }
 function signed(inState){$('signedOut').hidden=inState;$('signedIn').hidden=!inState;}
 function makeRow(parent,heading,detail,status,callback,canRetry){const item=document.createElement('div');item.className='sync-item';const left=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent=heading;sub.textContent=`${detail} · ${status}`;left.append(title,sub);item.append(left);
  if(canRetry){const btn=document.createElement('button');btn.type='button';btn.className='outline-btn';btn.textContent='Riprova sincronizzazione';btn.addEventListener('click',async()=>{btn.disabled=true;try{const r=await callback();banner(r.google_sync==='created'?'Evento Calendar verificato e confermato.':r.email_status==='sent'?'Conferma email accettata da Gmail.':`Stato: ${r.google_sync||r.email_status}. Controlla eventuali errori prima di ripetere.`,r.google_sync==='created'||r.email_status==='sent'?'good':'bad');await refresh();}catch(e){banner(e.message,'bad');}finally{btn.disabled=false;}});item.append(btn);}parent.append(item);
 }
 async function refresh(){const status=await call('admin_status');signed(true);$('googleEmail').textContent=status.google_email||'Non collegato';$('calendarBadge').textContent=status.calendar_authorized?'Autorizzato':'Da collegare';$('calendarBadge').className=status.calendar_authorized?'badge-positive':'badge-warning';$('gmailBadge').textContent=status.gmail_authorized?'Autorizzato':'Da collegare';$('gmailBadge').className=status.gmail_authorized?'badge-positive':'badge-warning';$('scopeStatus').textContent=status.google_connected?'Permessi concessi: '+(status.granted_scopes||[]).filter(s=>s.includes('googleapis.com/auth')).map(s=>s.split('/').at(-1)).join(', '):'Nessuna connessione Google';$('calendarId').value=status.calendar_id||'primary';
  const pending=$('pendingList');pending.replaceChildren();if(!status.pending?.length){const t=document.createElement('p');t.className='sync-empty';t.textContent='Nessuna prenotazione in attesa nella lista recente.';pending.append(t);}
  for(const b of status.pending||[])makeRow(pending,b.id,new Date(b.created_at).toLocaleString('it-IT'),b.calendar_status,()=>call('admin_retry',{booking_id:b.id}),true);
  const list=$('mailList');list.replaceChildren();if(!status.emails?.length){const t=document.createElement('p');t.className='sync-empty';t.textContent='Nessuna conferma Gmail registrata.';list.append(t);}
  for(const m of status.emails||[])makeRow(list,m.booking_id,new Date(m.created_at).toLocaleString('it-IT'),m.status,()=>call('admin_retry_email',{booking_id:m.booking_id}),['failed','pending'].includes(m.status));
 }
 async function refreshRoster(){
  const r=await call('admin_student_list');const box=$('rosterList');box.replaceChildren();
  for(const item of r.students||[]){const p=document.createElement('p');p.className='sync-item';p.textContent=`${item.institution} · ${item.student_number} · ${item.institutional_email} · ${item.preferred_language}`;box.append(p);}
  if(!(r.students||[]).length)box.textContent='Registro vuoto. Importa o aggiungi soltanto profili autorizzati.';
 }
 async function refreshDocuments(){
  const r=await call('admin_document_list');const box=$('documentList');box.replaceChildren();
  for(const item of r.documents||[]){const p=document.createElement('p');p.className='sync-item';p.textContent=`${item.institution} · ${item.title} · ${item.verified?'VERIFICATO':'Bozza'} · ${item.source_url}`;box.append(p);}
  if(!(r.documents||[]).length)box.textContent='Nessuna fonte ufficiale caricata.';
 }
 async function init(){for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,restartAdminIdle,{passive:true});restartAdminIdle();let fragment=new URLSearchParams(window.location.hash.slice(1));const received=fragment.get('admin_token'),error=fragment.get('oauth_error');
  if(received){token=received;try{sessionStorage.setItem(key,token);}catch{}}else{try{token=sessionStorage.getItem(key);}catch{token=null;}}
  try{history.replaceState(null,'',window.location.pathname+window.location.search);}catch{window.location.hash='';}
  $('connectGoogle').href=startUrl;$('reconnectButton').href=startUrl;
  $('connectGoogle').addEventListener('click',event=>{if($('connectGoogle').getAttribute('aria-disabled')==='true')event.preventDefault();});
  $('rosterForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await call('admin_student_upsert',{institution:$('rosterInstitution').value,student_number:$('rosterNumber').value.trim(),institutional_email:$('rosterEmail').value.trim(),preferred_language:$('rosterLanguage').value,program:$('rosterProgram').value.trim()});banner(r.saved?'Profilo studente verificato salvato.':'Salvataggio non riuscito',r.saved?'good':'bad');$('rosterForm').reset();await refreshRoster();}catch(err){banner(err.message,'bad');}});
  $('documentForm').addEventListener('submit',async e=>{e.preventDefault();try{const r=await call('admin_document_create',{institution:$('docInstitution').value,title:$('docTitle').value.trim(),source_url:$('docUrl').value.trim(),version:$('docVersion').value.trim(),content:$('docContent').value.trim(),verified:$('docVerified').checked});banner(r.saved?'Documento inserito: '+(r.verified?'fonte verificata':'bozza non consultabile da Casey'):'Documento non salvato',r.saved?'good':'bad');$('documentForm').reset();await refreshDocuments();}catch(err){banner(err.message,'bad');}});
  $('verifyButton').addEventListener('click',async()=>{banner('Verifico autorizzazione e accesso alle disponibilità Google…');try{const v=await call('admin_verify');banner(`Calendar: ${v.calendar_ok?'verificato':'non disponibile'}. Gmail: ${v.gmail_authorized?'permesso presente':'non autorizzato'}. Account: ${v.google_email}`,'good');}catch(e){banner(e.message,'bad');}});
  $('calendarForm').addEventListener('submit',async e=>{e.preventDefault();banner('Verifico il calendario selezionato…');try{const r=await call('admin_calendar',{calendar_id:$('calendarId').value.trim()});banner('Calendario verificato e salvato: '+r.calendar_id,'good');await refresh();}catch(e){banner(e.message,'bad');}});
  $('logoutButton').addEventListener('click',async()=>{try{await call('admin_logout');}catch{}token=null;try{sessionStorage.removeItem(key);}catch{}signed(false);banner('Sessione amministrativa chiusa.','good');});
  $('disconnectButton').addEventListener('click',async()=>{if(!confirm('Scollegare Google? Casey non potrà creare nuovi appuntamenti o inviare email finché non ricolleghi l’account.'))return;try{await call('admin_disconnect');banner('Account scollegato. Le prenotazioni e gli eventi già creati rimangono invariati.','good');await refresh();}catch(e){banner(e.message,'bad');}});
  if(error)banner(decodeURIComponent(error),'bad');
  if(token){try{await refresh();await Promise.all([refreshRoster(),refreshDocuments()]);if(!error)banner('Accesso amministrativo attivo. Controlla lo stato delle integrazioni.','good');return;}catch(e){token=null;try{sessionStorage.removeItem(key);}catch{}banner('Accesso scaduto: autentica nuovamente il tuo account Google.','bad');}}
  signed(false);
  try{const c=await call('public_config');if(c.oauth_configured){$('connectGoogle').classList.remove('disabled-link');$('connectGoogle').removeAttribute('aria-disabled');$('connectHelp').textContent='Accesso riservato agli account staff configurati. La prima autorizzazione Google potrebbe mostrare la schermata di consenso.';if(!error)banner('Pronto per il collegamento OAuth. Accedi con il tuo account staff.');}
  else{banner('Google Calendar e Gmail non sono ancora collegati a questa demo.');$('connectHelp').textContent='Le impostazioni sono disponibili. Il collegamento Google richiede prima la configurazione dell’account autorizzato.';}}
  catch(e){banner('Impossibile raggiungere la configurazione server: '+e.message,'bad');}
 }
 document.addEventListener('DOMContentLoaded',init);
})();
