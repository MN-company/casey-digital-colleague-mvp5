/* Three explicit campus workflows. Server results, never model claims, drive UI effects. */
(()=>{'use strict';const C=window.CASEY_CONFIG;let token='',pending=null;
async function api(body){const r=await fetch(C.apiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token},body:JSON.stringify(body),signal:AbortSignal.timeout(28000)});const d=await(window.CaseyErrors?.json(r)||r.json());if(!r.ok)throw Object.assign(Error(d.error||'Operazione non disponibile'),{status:r.status});return d;}
async function session(){if(token)return;if(!pending)pending=api({action:'session'}).then(d=>token=d.token).finally(()=>pending=null);await pending;}
function availability(data){let panel=document.getElementById('caseyOfficeAvailability');if(!panel){panel=document.createElement('section');panel.id='caseyOfficeAvailability';panel.className='campus-availability';const host=document.getElementById('v-CAL')||document.getElementById('vCasey');const calendar=document.getElementById('cal');if(calendar&&document.getElementById('v-CAL'))calendar.before(panel);else host?.append(panel);}panel.replaceChildren();const title=document.createElement('h3');title.textContent='Disponibilità reali · Google Calendar Student Office';panel.append(title);const info=document.createElement('p');info.textContent=data.calendar_connected?'Orari verificati sul calendario collegato. Conferma la scelta nell’app College.':'Il calendario non ha restituito disponibilità verificata. Nessun appuntamento è stato creato.';panel.append(info);for(const slot of data.slots||[]){const n=document.createElement('div');n.className='campus-slot';n.textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'full',timeStyle:'short'}).format(new Date(slot.starts_at||slot.start));panel.append(n);}}
const matches=q=>/check[\s-]?in|pronote|badge|internship|tirocinio|\bstage\b/i.test(String(q));
async function handle(query){query=String(query||'').trim();if(query.length<3||!matches(query))return {matched:false};await session();const r=await api({action:'service_case',query,language:window.CaseyLanguage?.get()||'it-IT'});if(!r.matched)return r;
 if(r.review_saved&&r.review?.id)window.dispatchEvent(new CustomEvent('casey:review-created',{detail:r.review}));
 if(r.case==='badge_reschedule'){
  const inApp=/app-(blu|rossa)\.html$/.test(location.pathname);
  if(inApp){sessionStorage.setItem('casey-badge-intent','1');if(window.CaseyNativeHandoff?.active){sessionStorage.removeItem('casey-badge-intent');r.availability=await window.CaseyNativeHandoff.slots();r.requires_handoff=false;}if(window.CaseyNativeHandoff?.active)r.answer='Controllo gli orari reali dello Student Office. Puoi scegliere qui un nuovo orario per il ritiro del badge.';}
  else{if(typeof window.setTab==='function')window.setTab('CAL');await window.handover?.(r.answer,'badge');}
  if(!inApp||!window.CaseyNativeHandoff?.active)availability(r.availability);if(inApp&&!window.CaseyNativeHandoff?.active){const panel=document.getElementById('caseyOfficeAvailability');const button=document.createElement('button');button.type='button';button.textContent='Continua con il tuo account';button.onclick=()=>window.openSheet?.();panel?.append(button);}
 }
 window.dispatchEvent(new CustomEvent('casey:service-case',{detail:{case:r.case}}));return r;
}
window.CaseyCampusCases=Object.freeze({handle,matches});})();
