/* Casey Original UI Bridge v5
 * The underlying H-FARM Casey visual layout and avatar are unchanged.
 * No demo state is ever saved as an actual booking or request.
 * Credentials belong to Supabase Edge Functions, not this static site.
 */
(() => {
 'use strict';
 const API=window.CASEY_CONFIG.apiUrl;
 const TZ='Europe/Rome';
 const $=id=>document.getElementById(id);
 const state={session:null,student:window.CaseyAuth.get(),profile:null,month:new Date().getUTCFullYear()+'-'+String(new Date().getUTCMonth()+1).padStart(2,'0'),
  officeSlots:[],events:[],bookings:[],calendarStatus:'',googleConnected:false,studentGoogleConnected:false,
  requests:[],requestIndex:0,pending:null,pendingRequest:'',slotsForDay:[],selectedDate:null,processing:false};
 let turnController=null, turnRevision=0;
 window.cancelStandardTurn=()=>{if(turnController){turnController.abort();turnController=null;++turnRevision;state.processing=false;}};
 const old={render:window.renderAll,scenario:window.setScenario,perspective:window.setPerspective,tab:window.switchTab,reset:window.resetDemo};

 // Shared-public-terminal protection: sign out authenticated students and staff after inactivity.
 const KIOSK_IDLE_MS=180000;
 let kioskIdleTimer=null;
 async function expireKioskIdentity(){
   const hadPrivate=!!window.CaseyAuth.get()||!!sessionStorage.getItem('casey-v3-admin');
   if(!hadPrivate)return;
   window.CaseyAuth.clear();
   try{sessionStorage.removeItem('casey-v3-admin');sessionStorage.removeItem('casey-original-ui-session');}catch{}
   window.CaseyDialogue?.clear();
   state.session=null;state.student=null;state.profile={authenticated:false,registered:false};
   state.events=[];state.bookings=[];state.requests=[];state.pendingRequest='';state.pending=null;
   state.processing=false;
   try{await window.CaseyLive?.stop?.('Sessione terminata per inattività');}catch{}
   try{clearConfirm();dismissOfficeRequest();hideLogin();}catch{}
   accountUi();
   try{await refreshCalendar();await refreshRequests();}catch{}
   caption('Sessione chiusa automaticamente per inattività. Accedi di nuovo per visualizzare informazioni personali.',null,'A');
 }
 function armKioskIdle(){
   if(kioskIdleTimer)clearTimeout(kioskIdleTimer);
   kioskIdleTimer=setTimeout(expireKioskIdentity,KIOSK_IDLE_MS);
 }
 function startKioskIdle(){
   for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,armKioskIdle,{passive:true});
   window.addEventListener('casey:activity',armKioskIdle);
   armKioskIdle();
 }

 function isoMonth(){return state.month;}
 function timeRome(iso){if(!iso)return '';const date=new Date(iso);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('it-IT',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(date);}
 function dateRome(iso){if(!iso)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(iso))return iso;const d=new Date(iso);if(isNaN(d.getTime()))return '';const p=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);let m={};for(const x of p)m[x.type]=x.value;return [m.year,m.month,m.day].join('-');}
 function human(iso){try{return new Intl.DateTimeFormat('it-IT',{timeZone:TZ,dateStyle:'full',timeStyle:'short'}).format(new Date(iso));}catch{return String(iso||'');}}
 function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();}
 function notice(text){const el=$('caseyCalendarStatus');if(el)el.textContent=text;state.calendarStatus=text;}
 function caption(text,source=null,avatar='A'){
  // Never play browser TTS over the native Gemini Live audio stream.
  window.CaseyDialogue?.append('assistant',String(text||''));
  if(window.CaseyLive?.active){$('subtitleBox').textContent=String(text||'');return;}
  if(typeof window.streamSubtitles==='function')window.streamSubtitles(text,source,avatar);
  else $('subtitleBox').textContent=text;
 }
 function errorMessage(e){return String(e?.message||'Operazione non riuscita. Riprova.');}
 function profileReady(){return !!state.profile?.registered;}
 function authToken(){return window.CaseyAuth.get()?.access_token||null;}
 function adminToken(){return sessionStorage.getItem('casey-v3-admin')||null;}
 const metrics=[];
 window.CaseyMetrics={snapshot:()=>metrics.map(x=>({...x}))};
 async function api(action,body={},opts={}){
  const requestStart=performance.now();let firstTextAt=null;
  if(!state.session&&action!=='session'&&action!=='public_config')await ensureSession();
  const headers={'Content-Type':'application/json'};
  if(state.session)headers['x-session-token']=state.session;
  if(opts.student!==false&&authToken())headers['x-student-token']=authToken();
  if(opts.admin)headers['x-admin-token']=adminToken()||'';
  const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...body}),signal:opts.signal?AbortSignal.any([opts.signal,AbortSignal.timeout(26000)]):AbortSignal.timeout(26000)});
  let data;
  if(res.ok && res.headers.get('content-type')?.includes('application/x-ndjson')){
   const reader=res.body.getReader(),decoder=new TextDecoder();let pending='',complete=false;
   const accept=line=>{if(!line.trim())return;const frame=JSON.parse(line);
    if(frame.type==='text'&&typeof frame.text==='string'){if(firstTextAt===null)firstTextAt=performance.now();opts.onText?.(frame.text);}
    if(frame.type==='done'){data=frame.result;complete=true;}
    if(frame.type==='error')throw new Error(frame.error||'Risposta interrotta');
   };
   try{while(true){const {done,value}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});let at;while((at=pending.indexOf('\n'))>=0){accept(pending.slice(0,at));pending=pending.slice(at+1);}if(done){if(pending)accept(pending);break;}}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   if(!complete)throw new Error('Risposta interrotta: riprova.');
  }else data=await res.json().catch(()=>({error:'Risposta backend non leggibile'}));
  if(!res.ok){const ex=new Error(data.error||'Errore '+res.status);ex.status=res.status;throw ex;}
  metrics.push({action,durationMs:Math.round(performance.now()-requestStart),firstTextMs:firstTextAt===null?null:Math.round(firstTextAt-requestStart)});if(metrics.length>30)metrics.shift();
  return data;
 }
 async function ensureSession(){
  const key='casey-original-ui-session';
  try{const v=JSON.parse(sessionStorage.getItem(key)||'null');if(v?.token&&v.exp>Date.now()+60000){state.session=v.token;return v.token;}}catch{}
  const data=await api('session',{},{});state.session=data.token;
  try{sessionStorage.setItem(key,JSON.stringify({token:state.session,exp:Date.now()+(data.expires_in||86400)*1000}));}catch{}
  return state.session;
 }
 function accountUi(){
  const btn=$('caseyAccountBtn');if(btn){btn.textContent=state.profile?.authenticated?(state.profile.email||'Account studente'):'Account studente';}
  const badge=$('accountBadgeRight');if(badge)badge.textContent=currentPerspective==='OFFICE'?(adminToken()?'Student Office · account amministratore':'Student Office · non autenticato'):(state.profile?.registered?state.profile.email:(state.profile?.authenticated?'Email verificata · registro universitario non presente':'Studente · accesso non effettuato'));
 }
 function cleanTabs(){
  const tabs=$('tabsHeaderContainer');if(!tabs)return;
  const names=currentPerspective==='OFFICE'?[['CALENDAR','Calendario ufficio'],['GMAIL','Richieste · revisione staff']]:[['CHECKLIST','La mia pratica'],['CALENDAR','Il mio calendario'],['GMAIL','Le mie richieste']];
  tabs.replaceChildren();for(const [id,label] of names){const b=document.createElement('button');b.type='button';b.className='px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition '+(currentTab===id?'border-[#1D2347] text-[#1D2347] bg-white':'border-transparent text-slate-500 hover:text-[#1D2347]');b.textContent=label;b.onclick=()=>window.switchTab(id);tabs.append(b);}
  const queue=$('view-QUEUE');queue.classList.add('hidden');
  for(const t of ['CALENDAR','GMAIL','CHECKLIST']){const el=$('view-'+t);el.classList.toggle('hidden',currentTab!==t);if(t==='GMAIL')el.classList.toggle('grid',currentTab===t);}
  const label=$('perspectiveHint');if(label)label.textContent=currentPerspective==='OFFICE'?'Vista operativa Student Office · account staff richiesto':`Percorso demo ${currentScenario==='EMMA'?'Emma (matricola)':'Sofia (tirocinio)'} · dati personali solo dopo accesso`;
 }
 function quickPrompts(){
  const label=$('quickPromptsLabel'),box=$('quickPromptsContainer');if(!box)return;
  label.textContent=currentScenario==='EMMA'?'Passo-passo demo · Caso 1: Matricola Emma':'Passo-passo demo · Caso 2: Tirocinio Sofia';
  const items=currentScenario==='EMMA' ? [
   ['1. Cerca uno slot libero','Vorrei prenotare un appuntamento allo Student Office questa settimana'],
   ['2. Cambia il giorno','Aspetta, quel giorno ho una lezione: troviamo un altro momento'],
   ['3. Domanda sulle presenze','Come funziona la registrazione delle presenze?'],
   ['4. Chiedi una proroga','Posso chiedere una proroga per il pagamento della rata?']
  ]:[
   ['1. Informazioni sul tirocinio','Come funziona il tirocinio curriculare?'],
   ['2. Cerca un appuntamento','Vorrei prenotare un incontro con il Career Service'],
   ['3. Cambia disponibilità','Mi servirebbe spostare il colloquio a settimana prossima'],
   ['4. Chiedi eccezione allo staff','Posso fare il tirocinio part-time per 20 settimane?']
  ];
  box.replaceChildren();for(const [name,message] of items){const b=document.createElement('button');b.type='button';b.className='bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs px-3 py-1.5 rounded-full transition font-medium';b.textContent=name;b.onclick=()=>window.sendUserMessage(message);box.append(b);}
 }
 function calendarEvents(){
  const grid=$('octoberCalendarGrid');if(!grid)return;
  const [y,m]=state.month.split('-').map(Number);const days=new Date(Date.UTC(y,m,0)).getUTCDate();const offset=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;
  $('caseyMonthLabel').textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m-1,2)));
  $('calendarTitle').textContent=currentPerspective==='OFFICE'?'Calendario reale dello Student Office':'Calendario personale dello studente';
  $('calendarSubtitle').textContent=currentPerspective==='OFFICE'?'Eventi Google visualizzati solo dopo l’accesso staff. Gli slot verdi sono disponibili anche per Casey.':'Impegni del tuo Google Calendar e prenotazioni Casey, separati dai percorsi demo.';
  $('calendarLegend').replaceChildren();for(const [name,bg] of [['Google Calendar','bg-blue-100'],['Appuntamento Casey','bg-[#1D2347]'],['Slot prenotabile','bg-emerald-200']]){const tag=document.createElement('span');tag.className='flex items-center gap-1.5';const dot=document.createElement('span');dot.className='w-2.5 h-2.5 rounded-full '+bg;tag.append(dot,document.createTextNode(name));$('calendarLegend').append(tag);}
  $('caseyGoogleConnect').classList.toggle('hidden',currentPerspective!=='STUDENT'||!profileReady()||state.studentGoogleConnected);
  const now=dateRome(new Date().toISOString());
  grid.replaceChildren();for(let x=0;x<offset;x++){const cell=document.createElement('div');cell.className='bg-slate-50/60 rounded-xl border border-slate-100 p-1.5';grid.append(cell);}
  for(let d=1;d<=days;d++){
   const day=state.month+'-'+String(d).padStart(2,'0');const isToday=day===now;
   const cell=document.createElement('button');cell.type='button';cell.className='casey-day rounded-xl border border-slate-200 bg-white p-1.5 flex flex-col text-left '+(isToday?'today':'');cell.setAttribute('aria-label','Disponibilità '+day);
   const dayTitle=document.createElement('span');dayTitle.className='text-[11px] font-bold text-slate-600';dayTitle.textContent=String(d);cell.append(dayTitle);
   for(const ev of [...state.events,...state.bookings].filter(e=>dateRome(e.start)===day).slice(0,3)){
    const item=document.createElement('span');item.className='casey-event '+(ev.source==='casey'?'casey':'google');item.textContent=(ev.start?.includes('T')?timeRome(ev.start)+' ':'')+ev.title;item.title=ev.title;cell.append(item);
   }
   const free=state.officeSlots.filter(slot=>dateRome(slot.start)===day);
   if(free.length){const pill=document.createElement('span');pill.className='casey-event free';pill.textContent=`${free.length} disponibilità`;cell.append(pill);}
   cell.onclick=()=>selectDay(day);
   grid.append(cell);
  }
 }
 async function refreshCalendar(){
  state.events=[];state.bookings=[];state.officeSlots=[];state.googleConnected=false;state.studentGoogleConnected=false;
  notice('Caricamento calendario e disponibilità in corso…');calendarEvents();
  const month=isoMonth();
  try{
   const availability=await api('availability_month',{month});state.officeSlots=availability.slots||[];state.googleConnected=!!availability.connected;
   if(currentPerspective==='OFFICE'){
    if(adminToken()){
     const r=await api('admin_live_calendar',{month},{admin:true});state.events=r.events||[];
     notice(r.connected?`Student Office: Google Calendar collegato. ${state.events.length} eventi nel mese, ${state.officeSlots.length} slot prenotabili.`:r.reason||'Collega Google Calendar dalle Impostazioni.');
    }else notice('Vista Student Office riservata: entra nelle Impostazioni e collega un account staff autorizzato. Nessun evento privato mostrato.');
   }else if(authToken()){
    const r=await api('student_live_calendar',{month});state.events=r.events||[];state.bookings=r.bookings||[];state.studentGoogleConnected=!!r.google_connected;
    notice(r.google_connected?`Calendario Google ${r.google_email}: ${state.events.length} eventi. ${state.bookings.length} prenotazioni Casey.`:`Il tuo Google Calendar non è collegato. ${state.bookings.length} prenotazioni Casey; per vedere il resto collega il tuo account Google.`);
   }else notice('Per visualizzare il tuo Google Calendar accedi con email verificata. La disponibilità pubblica dipende dal calendario Student Office.');
  }catch(e){notice('Calendario non disponibile: '+errorMessage(e));}
  calendarEvents();
 }
 function requestReader(){
  const list=$('gmailList'),reader=$('gmailReader');if(!list||!reader)return;
  const office=currentPerspective==='OFFICE';list.replaceChildren();reader.replaceChildren();
  if((office&&!adminToken())||(!office&&!authToken())){
   const p=document.createElement('div');p.className='text-xs text-slate-600 p-5';p.textContent=office?'Le richieste non sono email Gmail. Accedi come Student Office dalle Impostazioni per vedere le pratiche reali.':'Accedi come studente per vedere le richieste che hai realmente inviato con Casey.';list.append(p);
   if(office){const a=document.createElement('a');a.href='settings.html';a.className='casey-bridge-action inline-block m-4';a.textContent='Impostazioni Staff';reader.append(a);}
   else{const b=document.createElement('button');b.className='casey-bridge-action m-4';b.textContent='Accedi';b.onclick=showLogin;reader.append(b);}return;
  }
  if(!state.requests.length){const p=document.createElement('div');p.className='text-xs text-slate-600 p-5';p.textContent='Nessuna richiesta reale. Le demo Emma e Sofia non generano richieste fittizie.';list.append(p);return;}
  state.requestIndex=Math.min(state.requestIndex,state.requests.length-1);
  state.requests.forEach((r,i)=>{const b=document.createElement('button');b.className='casey-request-item '+(i===state.requestIndex?'selected':'');b.onclick=()=>{state.requestIndex=i;requestReader();};const heading=document.createElement('strong');heading.className='text-xs block';heading.textContent=r.subject;const body=document.createElement('small');body.className='block mt-1';body.textContent=(r.student_email||'')+' · '+new Date(r.created_at).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'});const tag=document.createElement('small');tag.className='block mt-1';tag.textContent='Stato: '+r.status;b.append(heading,body,tag);list.append(b);});
  const r=state.requests[state.requestIndex];const h=document.createElement('h3');h.className='text-lg font-extrabold text-[#1D2347] mb-3';h.textContent=r.subject;const meta=document.createElement('p');meta.className='text-xs text-slate-500 mb-4';meta.textContent=(r.institution?r.institution+' · ':'')+(r.student_email||'')+' · '+new Date(r.created_at).toLocaleString('it-IT')+' · '+r.status;const p=document.createElement('p');p.className='whitespace-pre-wrap text-xs text-slate-800 mb-5';p.textContent=r.body;reader.append(h,meta,p);
  const l=document.createElement('strong');l.className='text-xs text-slate-600';l.textContent=office?'Risposta interna / presa in carico':'Risposta dello Student Office';reader.append(l);
  if(office){const input=document.createElement('textarea');input.className='w-full border border-slate-200 rounded-xl p-3 text-xs mt-2 min-h-24 text-slate-800';input.value=r.staff_reply||'';reader.append(input);for(const [status,label] of [['in_review','Prendi in carico'],['resolved','Segna risolta'],['closed','Chiudi richiesta']]){const b=document.createElement('button');b.className='casey-bridge-action mt-3 mr-2';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await api('admin_request_update',{id:r.id,status,staff_reply:input.value},{admin:true});await refreshRequests();caption('Richiesta aggiornata nel registro interno Casey. Nessuna email esterna è stata inviata.',null,'D');}catch(e){caption(errorMessage(e),null,'F');}finally{b.disabled=false;}};reader.append(b);}}
  else{const content=document.createElement('p');content.className='text-xs text-slate-800 mt-2 whitespace-pre-wrap';content.textContent=r.staff_reply||'Lo Student Office non ha ancora risposto.';reader.append(content);}
 }
 async function refreshRequests(){
  state.requests=[];state.requestIndex=0;
  try{if(currentPerspective==='OFFICE'&&adminToken())state.requests=(await api('admin_requests',{}, {admin:true})).requests||[];
   else if(currentPerspective==='STUDENT'&&authToken())state.requests=(await api('student_requests')).requests||[];
  }catch(e){state.requests=[];}
  requestReader();
  const dot=$('officeAlertDot');if(dot)dot.classList.toggle('hidden',currentPerspective!=='OFFICE'||!state.requests.some(r=>r.status==='open'));
 }
 function renderAll(){
  if(currentTab==='QUEUE')currentTab='GMAIL';old.render();
  quickPrompts();cleanTabs();accountUi();calendarEvents();requestReader();
  $('studentCaseTitle').textContent=currentScenario==='EMMA'?'La mia pratica · onboarding (demo Emma)':'La mia pratica · tirocinio (demo Sofia)';
  $('gmailList').setAttribute('aria-label','Richieste inviate a Casey');
 }
 async function selectDay(day){
  state.selectedDate=day;
  if(currentPerspective==='OFFICE')return notice('Vista Student Office: il calendario si consulta qui; le prenotazioni vengono confermate dall’account studente.');
  try{const r=await api('slots',{day});state.slotsForDay=r.slots||[];
   const box=$('caseySlotOptions');box.replaceChildren();
   if(!r.slots?.length){notice(r.error||`Nessuna disponibilità verificata per ${day}.`);return;}
   notice(`Disponibilità verificate per ${day}: scegli un orario.`);
   for(const slot of r.slots){const button=document.createElement('button');button.className='text-xs px-3 py-2 rounded-lg font-bold';button.textContent=timeRome(slot.start);button.onclick=()=>prepareBooking(slot);box.append(button);}
  }catch(e){notice(errorMessage(e));}
 }
 function showLogin(){
  $('caseyAuthOverlay').hidden=false;$('caseyAuthFeedback').textContent=state.profile?.authenticated?'Email verificata: '+state.profile.email:'Inserisci la tua email universitaria.';
  $('caseyLogout').hidden=!state.profile?.authenticated;
 }
 function hideLogin(){$('caseyAuthOverlay').hidden=true;}
 async function refreshProfile(){
  state.student=window.CaseyAuth.get();if(!state.student){state.profile={authenticated:false,registered:false};accountUi();return;}
  try{state.profile=(await api('auth_profile')).profile;}catch{state.profile={authenticated:false,registered:false};}
  accountUi();
 }
 async function prepareBooking(slot){
  if(state.processing)return;
  if(!profileReady()){caption('Per prenotare devi prima verificare l’email ed essere presente nel registro studenti autorizzato. Apri Account studente.',null,'F');showLogin();return;}
  state.processing=true;
  try{const r=await api('prepare',{slot_id:slot.id});state.pending={...r,slot:slot};
   $('caseyConfirmLabel').textContent='Confermi '+human(slot.start)+'?';$('caseyConfirm').hidden=false;$('caseyComposer').style.display='none';
   caption('Ho trovato lo slot. Per creare l’appuntamento è necessaria la tua conferma esplicita tramite il pulsante Confermo.',null,'A');
  }catch(e){caption(errorMessage(e),null,'F');}finally{state.processing=false;}
 }
 function clearConfirm(){state.pending=null;$('caseyConfirm').hidden=true;$('caseyComposer').style.display='flex';}
 async function confirmBooking(ok){
  if(!state.pending)return;
  const pending=state.pending;
  if(!ok){clearConfirm();try{await api('abort');}catch{}caption('Prenotazione annullata: non ho creato alcun evento. Puoi scegliere un altro orario.',null,'A');window.dispatchEvent(new CustomEvent('casey:booking-result',{detail:{status:'cancelled'}}));return;}
  if(state.processing)return;state.processing=true;$('caseyYes').disabled=true;$('caseyNo').disabled=true;
  try{const r=await api('commit',{request_id:pending.request_id,slot_id:pending.slot.id,confirmation_token:pending.confirmation_token});clearConfirm();
   if(r.google_sync==='created')caption('Prenotazione confermata su Google Calendar per '+human(pending.slot.start)+'. '+(r.email_status==='sent'?'Conferma Gmail inviata.':'Controlla lo stato della conferma email nelle richieste.'),null,'D');
   else caption('La richiesta è stata registrata, ma la sincronizzazione Google non è confermata ('+(r.google_sync||'in verifica')+'). Lo Student Office deve verificarla prima di considerarla definitiva.',null,'F');
   window.dispatchEvent(new CustomEvent('casey:booking-result',{detail:{status:r.google_sync==='created'?'confirmed':'requires_review',google_sync:r.google_sync||'unconfirmed',start:pending.slot.start,email_status:r.email_status||'unknown'}}));
   await refreshCalendar();await refreshRequests();
  }catch(e){caption('Non ho potuto confermare: '+errorMessage(e)+'. Verifica lo stato prima di ripetere.',null,'F');window.dispatchEvent(new CustomEvent('casey:booking-result',{detail:{status:'error',message:'Verifica lo stato prima di ripetere la prenotazione.'}}));}
  finally{state.processing=false;$('caseyYes').disabled=false;$('caseyNo').disabled=false;}
 }
 function dismissOfficeRequest(){state.pendingRequest='';$('caseyEscalate').hidden=true;}
 async function submitOfficeRequest(){
  const text=state.pendingRequest;if(!text)return;
  if(!profileReady()){showLogin();caption('Per inoltrare una richiesta allo Student Office devi autenticarti con un profilo studente registrato.',null,'F');return;}
  if(state.processing)return;state.processing=true;
  try{const result=await api('student_submit_request',{subject:'Richiesta a Student Office',body:text,scenario:currentScenario});
   dismissOfficeRequest();caption('Richiesta registrata nel sistema Casey. Riferimento: '+result.request.id.slice(0,8)+'. Puoi seguirla nella scheda Le mie richieste.',null,'D');await refreshRequests();
  }catch(e){caption(errorMessage(e),null,'F');}finally{state.processing=false;}
 }
 // Adapter for Live tools. All actions call the same authenticated, idempotent backend as Standard.
 async function liveFindSlots(filters={}){
  const day=typeof filters.day==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(filters.day)?filters.day:undefined;
  const time=typeof filters.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(filters.time)?filters.time:undefined;
  const period=['morning','afternoon'].includes(filters.period)?filters.period:undefined;
  const result=await api('slots',{...(day?{day}:{}),...(time?{time}:{}),...(period?{period}:{})});
  return {slots:(result.slots||[]).slice(0,12),calendar_connected:result.calendar_connected===true};
 }
 async function livePrepareBooking(slotId){
  if(state.pending)return {status:'awaiting_confirmation',slot:state.pending.slot?.start||null};
  if(!profileReady()){
   showLogin();
   return {status:'authentication_required',message:'Per prenotare apri la app College con sessione autenticata oppure accedi a Casey; la demo pubblica non prenota anonimamente.'};
  }
  if(typeof slotId!=='string'||!/^[-a-f0-9]{36}$/i.test(slotId))return {status:'invalid_slot'};
  const found=await api('slot_lookup',{slot_id:slotId});
  if(!found.slot)return {status:'slot_unavailable'};
  // Reuses original prepare path and on-screen confirmation, not an alternate commit.
  await prepareBooking({id:found.slot.id,start:found.slot.starts_at,end:found.slot.ends_at});
  if(!state.pending)return {status:'preparation_failed'};
  const button=$('caseyYes');button?.focus({preventScroll:true});
  $('caseyConfirm')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  return {status:'awaiting_confirmation',request_id:state.pending.request_id,start:found.slot.starts_at,end:found.slot.ends_at,message:'Mostra pulsanti Confermo e Non confermo. Non dichiarare mai prenotato prima del click e della sincronizzazione Calendar.'};
 }
 async function liveBookingStatus(requestId){
  if(typeof requestId!=='string'||!/^[-a-f0-9]{36}$/i.test(requestId))return {status:'invalid_reference'};
  if(!profileReady())return {status:'authentication_required'};
  const r=await api('operation_status',{request_id:requestId});
  return {saved:r.saved===true,google_sync:r.google_sync||null,start:r.start||null,end:r.end||null,email_status:r.email_status||null};
 }
 async function liveSearchKnowledge(query){
  const r=await api('knowledge_lookup',{query:String(query||'').slice(0,360)});
  return {verified:r.verified===true,matches:r.matches||[],note:r.note||''};
 }
 async function sendUserMessage(customText=null){
  const input=$('userInput');const text=String(customText||input.value||'').trim();if(!text||state.processing)return;
  input.value='';
  if(state.pending){caption('Ho già preparato un appuntamento. Usa Confermo o Non confermo prima di proseguire.',null,'A');return;}
  if(window.CaseyLive?.active){
   if(!window.CaseyLive.ready){caption('Attendi che Live sia pronto.',null,'A');return;}
   if(window.CaseyLive.sendText(text))return;
  }
  if(window.CaseyLive?.startText){
   state.processing=true;
   try{await ensureSession();if(await window.CaseyLive.startText()){window.CaseyLive.sendText(text);return;}}
   finally{state.processing=false;}
  }
  dismissOfficeRequest();state.processing=true;
  const mine=++turnRevision;turnController=new AbortController();
  const history=(window.CaseyDialogue?.snapshot()||[]).slice(-6).map(t=>({role:t.role,text:t.text.slice(0,900)}));
  window.CaseyDialogue?.append('user',text);
  window.cancelStandardSpeech?.();
  window.setAvatarState?.('E');
  $('subtitleBox').textContent='Sto elaborando la richiesta…';
  try{
   const outcome=await api('turn',{message:text,language:window.CaseyVoice?.getLanguage()||'it-IT',history,stream:true},{signal:turnController.signal,onText:value=>{if(mine!==turnRevision)return;$('subtitleBox').textContent=value;$('subtitleBox').scrollTop=$('subtitleBox').scrollHeight;}});
   if(mine!==turnRevision)return;
   if(outcome.route==='stop'){clearConfirm();caption('Operazione interrotta. Non ho registrato alcuna prenotazione.',null,'A');return;}
   if(outcome.route==='booking'){
    const {day,time,period,error}=outcome.appointment||window.CaseyDates.parseAppointment(text);
    if(error){caption(error==='ambiguous_time'?'Intendi mattina o pomeriggio? Specifica per esempio 15:00.':'La data o l’ora non è valida o è già passata. Indica giorno e ora dell’appuntamento.',null,'A');return;}
    const availability=await api('slots',{...(day?{day}:{}),...(time?{time}:{}),...(period?{period}:{})});
    if(mine!==turnRevision)return;
    const slots=availability.slots||[];
    if(slots.length===0){caption('Non trovo disponibilità Google verificate per questa richiesta. Prova un altro giorno oppure chiedi allo Student Office.',null,'F');return;}
    state.slotsForDay=slots;
    if(day){const [y,m]=day.split('-');state.month=y+'-'+m;}
    currentTab='CALENDAR';window.renderAll();
    const box=$('caseySlotOptions');box.replaceChildren();for(const slot of slots){const b=document.createElement('button');b.className='text-xs px-3 py-2 rounded-lg font-bold';b.textContent=new Intl.DateTimeFormat('it-IT',{timeZone:TZ,weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(slot.start));b.onclick=()=>prepareBooking(slot);box.append(b);}
    caption(`Ho verificato ${slots.length} disponibilità sul calendario Student Office. Seleziona una proposta nella vista calendario; la prenotazione partirà soltanto dopo la conferma.`,null,'A');return;
   }
   if(outcome.route==='greeting'){const copy={'it-IT':'Ciao, sono Casey. Posso verificare disponibilità per un appuntamento o aiutarti a inviare una richiesta allo Student Office.','en-US':'Hi, I am Casey. I can check appointment availability or help you contact the Student Office.','es-ES':'Hola, soy Casey. Puedo comprobar la disponibilidad de citas o ayudarte a contactar con la oficina de estudiantes.'};caption(copy[window.CaseyVoice.getLanguage()]||copy['it-IT'],null,'B');return;}
   if(outcome.route==='thanks'){const copy={'it-IT':'Prego. Se non hai altre richieste, ci fermiamo qui.','en-US':'You are welcome. Let me know if you need anything else.','es-ES':'De nada. Dime si necesitas algo más.'};caption(copy[window.CaseyVoice.getLanguage()]||copy['it-IT'],null,'A');return;}
   if(outcome.answer){caption(outcome.answer,outcome.sources?.length?outcome.sources.map(x=>x.title).join(', '):null,outcome.route==='handoff'?'F':'D');}
   if(outcome.route==='handoff'){state.pendingRequest=text;$('caseyEscalate').hidden=false;}
  }catch(e){if(mine===turnRevision)caption(errorMessage(e),null,'F');}
  finally{if(mine===turnRevision){state.processing=false;turnController=null;}}
 }
 async function connectStudentGoogle(){
  if(!profileReady()){showLogin();return;}
  try{const dest=window.location.origin+window.location.pathname;const r=await api('student_google_start',{return_to:dest});window.location.assign(r.state_cookie_url);}catch(e){notice(errorMessage(e));}
 }
 function goToday(){state.month=dateRome(new Date().toISOString()).slice(0,7);refreshCalendar();}
 function shiftMonth(offset){const [y,m]=state.month.split('-').map(Number);const date=new Date(Date.UTC(y,m-1+offset,1));state.month=date.toISOString().slice(0,7);refreshCalendar();}
 async function logout(){window.CaseyDialogue?.clear();try{await window.CaseyLive?.stop?.('Account disconnesso');}catch{}window.CaseyAuth.clear();state.student=null;state.profile={authenticated:false,registered:false};state.requests=[];state.bookings=[];hideLogin();accountUi();await refreshCalendar();await refreshRequests();}
 async function init(){
  startKioskIdle();
  // Do not consume personal data when switching between Emma/Sofia demonstration steps.
  window.renderAll=renderAll;
  window.sendUserMessage=sendUserMessage;
  window.switchTab=id=>{currentTab=id==='QUEUE'?'GMAIL':id;window.renderAll();if(currentTab==='CALENDAR')refreshCalendar();if(currentTab==='GMAIL')refreshRequests();};
  window.setScenario=id=>{old.scenario(id);quickPrompts();};
  window.setPerspective=id=>{old.perspective(id);refreshCalendar();refreshRequests();};
  window.resetDemo=()=>{window.CaseyDialogue?.clear();dismissOfficeRequest();clearConfirm();state.slotsForDay=[];old.reset();refreshCalendar();refreshRequests();};
  $('caseyOtpStart').addEventListener('submit',async e=>{e.preventDefault();const email=$('caseyEmail').value.trim();const msg=$('caseyAuthFeedback');msg.textContent='Invio del codice in corso…';try{await window.CaseyAuth.sendCode(email);$('caseyOtpVerify').hidden=false;msg.textContent='Controlla la tua email: inserisci il codice OTP ricevuto. (Richiede template OTP configurato su Supabase.)';}catch(err){msg.textContent=errorMessage(err);}});
  $('caseyOtpVerify').addEventListener('submit',async e=>{e.preventDefault();try{await window.CaseyAuth.verifyCode($('caseyEmail').value.trim(),$('caseyOtp').value.trim());await refreshProfile();if(!profileReady()){$('caseyAuthFeedback').textContent='Email verificata, ma non sei nel registro studenti H-FARM autorizzato. Lo Student Office deve collegare il profilo.';return;}hideLogin();caption('Accesso completato. Il tuo account è associato a '+state.profile.institution+'.',null,'D');await refreshCalendar();await refreshRequests();}catch(err){$('caseyAuthFeedback').textContent=errorMessage(err);}});
  try{await ensureSession();await refreshProfile();}catch(e){caption('Il backend non è disponibile: '+errorMessage(e),null,'F');}
  const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.has('student_google_error'))notice(fragment.get('student_google_error'));if(fragment.has('student_google'))notice('Account Google collegato. Ricarico il calendario.');if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  window.renderAll();await Promise.all([refreshCalendar(),refreshRequests()]);
 }
 window.CaseyBridge={showLogin,hideLogin,logout,shiftMonth,goToday,connectStudentGoogle,confirmBooking,submitOfficeRequest,dismissOfficeRequest,selectDay,refreshCalendar,refreshRequests,liveFindSlots,livePrepareBooking,liveBookingStatus,liveSearchKnowledge};
 document.addEventListener('DOMContentLoaded',init);
})();
