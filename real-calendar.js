/* Calendar identity follows the selected view; staff tokens never serve the student view. */
(()=>{'use strict';let revision=0;const api=CASEY_CONFIG.settingsApiUrl;
const month=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit'}).format(new Date());
async function refresh(){if(document.hidden)return;if(typeof TAB!=='undefined'&&TAB!=='CAL'){++revision;document.getElementById('cal').replaceChildren();return;}const request=++revision,view=VIEW,grid=document.getElementById('cal'),sub=document.getElementById('calSub');document.querySelectorAll('[data-student-calendar-control]').forEach(n=>n.remove());grid.replaceChildren();document.getElementById('calTitle').textContent=view==='STUDENT'?'Il mio calendario · Studente':'Student Office';sub.textContent='Caricamento…';
 const current=()=>request===revision&&VIEW===view;
 const link=(text,href)=>{const a=document.createElement('a');a.textContent=text;a.href=href;grid.append(a);};
 try{let d;
 if(view==='STUDENT'){
  if(!window.CaseyAccount.auth()){sub.textContent='Accedi come studente per vedere il tuo calendario. Il calendario Student Office è separato.';link('Accedi','app-blu.html?account=1');return;}
  d=await window.CaseyAccount.call('student_live_calendar',{month:month()});if(!current())return;
  sub.textContent=d.needs_selection?'Scegli un calendario diverso da Student Office.':d.google_connected?'Calendario studente · '+d.google_email:'Il tuo Google Calendar non è collegato. Nessun evento Student Office viene mostrato.';
  const manage=document.createElement('button');manage.type='button';manage.textContent=d.google_connected?'Gestisci il mio calendario':'Collega il mio Google Calendar';manage.onclick=()=>void window.CaseyPersonalCalendar.open();grid.before(manage);document.querySelectorAll('[data-student-calendar-control]').forEach(n=>n.remove());manage.dataset.studentCalendarControl='true';
  d={events:[...(d.events||[]),...(d.bookings||[])]};
 }else{
  const token=sessionStorage.getItem('casey-v3-admin');if(!token){sub.textContent='Accedi come staff per visualizzare gli eventi del calendario collegato.';link('Accedi nelle Impostazioni, poi torna al calendario','settings.html');return;}
  const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({action:'admin_live_calendar',month:month()}),signal:AbortSignal.timeout(25000)});d=await r.json();if(!current())return;if(sessionStorage.getItem('casey-v3-admin')!==token){void refresh();return;}if(!r.ok)throw Error(d.error||'Calendario non disponibile');if(!d.connected)throw Error(d.reason||'Collega Google Calendar nelle Impostazioni');sub.textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(new Date());
 }
 if(!current())return;const fragment=document.createDocumentFragment();const [y,m]=month().split('-').map(Number),days=new Date(y,m,0).getDate(),offset=(new Date(y,m-1,1).getDay()+6)%7;grid.style.setProperty('--calendar-weeks',Math.ceil((offset+days)/7));
 for(const n of ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']){const e=document.createElement('div');e.className='dn';e.textContent=n;fragment.append(e);}for(let i=0;i<offset;i++){const e=document.createElement('div');e.className='day pad';fragment.append(e);}
 for(let day=1;day<=days;day++){const cell=document.createElement('div');cell.className='day';const n=document.createElement('div');n.className='n';n.textContent=day;cell.append(n);const date=month()+'-'+String(day).padStart(2,'0');for(const ev of d.events||[]){const local=ev.start.includes('T')?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ev.start)):ev.start;if(local!==date)continue;const item=document.createElement('div');item.className='ev';item.textContent=(ev.start.includes('T')?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(ev.start))+' ':'')+ev.title;cell.append(item);}fragment.append(cell);}grid.replaceChildren(fragment);
 }catch(e){if(current()){grid.replaceChildren();sub.textContent=e.message;}}}
window.renderCal=()=>{document.querySelectorAll('[data-student-calendar-control]').forEach(n=>n.remove());void refresh();};
for(const event of ['focus','pageshow','casey:account-change','casey:booking-result'])window.addEventListener(event,()=>window.renderCal());window.addEventListener('storage',e=>{if(e.key==='casey-beta-auth-v1')window.renderCal();});
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('casey-calendar-updates'):null;channel?.addEventListener('message',()=>window.renderCal());void refresh();})();
