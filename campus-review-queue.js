/* Public totem receives only its own saved result; full queue access requires staff auth. */
(()=>{'use strict';const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=new Map(),drafts=new Map(),notes=new Map(),busy=new Set();
// ?demo=1: show only reviews created after this page loaded (5 s tolerance for clock skew), newest first.
const DEMO=new URLSearchParams((window.location&&window.location.search)||'').get('demo')==='1',LOADED=Date.now(),SKEW=5000;
const fresh=r=>{if(!DEMO)return true;const t=Date.parse(r?.created_at||'');return Number.isFinite(t)&&t>=LOADED-SKEW;};
const staffToken=()=>sessionStorage.getItem('casey-v3-admin');
function upsert(r,{force=false}={}){if(!r?.id||(!force&&!fresh(r)))return;records.set(r.id,r);const t={status:r.status==='open'?'PENDING':'IN_REVIEW',id:r.id,real:true,q:r.subject,question:r.question||'',reviewStatus:r.status,created_at:r.created_at,staff_reply:r.staff_reply||''};const i=queue.findIndex(x=>x.id===t.id);if(i>=0)queue[i]=t;else queue.unshift(t);
 const real=queue.filter(x=>x.real).sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0));queue.splice(0,queue.length,...real,...queue.filter(x=>!x.real));renderQueue();renderTabs();}
// Question = first lines (domanda) + optional "Dettagli richiesta:" block of "- Label: value" lines.
function parseQuestion(text){const ask=[],details=[];for(const raw of String(text||'').split('\n')){const l=raw.trim();if(!l||/^dettagli richiesta:?$/i.test(l))continue;const m=/^-\s*([^:]{1,40}):\s*(.+)$/.exec(l);if(m)details.push([m[1].trim(),m[2].trim()]);else if(!details.length)ask.push(l);else details.push(['',l.replace(/^-\s*/,'')]);}return {ask:ask.join(' '),details};}
// Staff reply template from the "- Label: value" lines; any missing field drops its clause.
function draftReply(question){const by=new Map(parseQuestion(question).details.map(([l,v])=>[l.toLowerCase(),v])),g=k=>by.get(k)||'';
 const who=g('studente'),name=who&&who!=='Studente College'?who.split(/\s+/)[0]:'';
 const s='abbiamo ricevuto la tua richiesta per lo stage part-time'+(g('impegno')?' ('+g('impegno')+')':'')+(g('ruolo')?' come '+g('ruolo'):'')+(g('azienda')?' presso '+g('azienda'):'')+(g('periodo')?', nel periodo '+g('periodo'):'')+'. Verificheremo la compatibilità con le lezioni'+(g('lezioni da conciliare')?' ('+g('lezioni da conciliare')+')':'')+' e ti risponderemo a breve. Per completare la valutazione inviaci la bozza del contratto.';
 return 'Buongiorno'+(name?' '+name:'')+',\n\n'+s+'\n\nStudent Office';}
const romeTime=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};
const BADGE={open:'REVISIONE STAFF',in_review:'IN REVISIONE',resolved:'RISOLTA',closed:'CHIUSA'};
const draftOf=t=>drafts.has(t.id)?drafts.get(t.id):(t.staff_reply||draftReply(t.question));
window.parseCampusReviewQuestion=parseQuestion;window.campusReviewDraft=draftReply;
window.renderCampusReview=t=>{const {ask,details}=parseQuestion(t.question),at=romeTime(t.created_at),staff=!!staffToken(),done=t.reviewStatus==='resolved'||t.reviewStatus==='closed',id=escape(t.id),off=busy.has(t.id)?' disabled':'',note=notes.get(t.id);
 return '<div class="tk real-review"><div class="r1"><div><div class="id">RICHIESTA '+escape(String(t.id||'').slice(0,8))+' · STUDENT OFFICE · da Casey (app College)</div><h4>'+escape(t.q)+'</h4></div><span class="lvl h">'+(BADGE[t.reviewStatus]||'CHIUSA')+'</span></div>'+
 (at?'<div class="kv">Ricevuta: <b>'+escape(at)+'</b></div>':'')+(ask?'<p class="real-review-question">'+escape(ask)+'</p>':'')+
 (details.length?'<div class="kv real-review-details">'+details.map(([l,v])=>(l?escape(l)+': ':'')+'<b>'+escape(v)+'</b>').join('<br>')+'</div>':'')+
 '<p class="real-review-note">Valutazione dello staff: Casey non approva né respinge la richiesta.</p>'+(staff&&t.reviewStatus==='open'?'<button class="btn gh" data-campus-review="'+id+'"'+off+'>Prendi in carico</button>':'')+
 (staff&&!done?'<textarea aria-label="Bozza di risposta alla richiesta '+id+'" data-review-draft="'+id+'" rows="6">'+escape(draftOf(t))+'</textarea><div class="acts">'+
  '<button class="btn gh" data-review-save="'+id+'"'+off+'>Salva bozza</button><button class="btn ok" data-review-send="'+id+'"'+off+'>Invia risposta</button><button class="btn gh" data-review-reset="'+id+'"'+off+'>Scarta la bozza</button></div>':'')+
 (note?'<div class="kv real-review-result" role="status" style="margin-top:12px;font-weight:700;color:var('+(note.ok?'--ok':'--bad, #b42318')+')">'+escape(note.text)+'</div>':'')+'</div>';};
window.addEventListener('casey:review-created',e=>{upsert(e.detail,{force:true});if(typeof window.setTab==='function')window.setTab('QUEUE');});
async function post(body){const staff=staffToken();if(!staff)throw Error('Accedi come staff per gestire la richiesta.');const r=await fetch(CASEY_CONFIG.settingsApiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':staff},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Operazione non riuscita (HTTP '+r.status+').');return d;}
async function refresh(){if(!staffToken())return;try{const d=await post({action:'admin_service_reviews',...(DEMO?{include_test:true}:{})});for(const item of d.reviews||[])upsert(item);}catch{}}
async function act(id,kind){const r=records.get(id),text=drafts.has(id)?drafts.get(id):draftOf({id,question:r?.question,staff_reply:r?.staff_reply});busy.add(id);notes.delete(id);renderQueue();
 try{if(kind==='take'){await post({action:'admin_service_review_update',id,status:'in_review',staff_reply:''});r&&(r.status='in_review');}
  else if(kind==='save'){const d=await post({action:'admin_service_review_update',id,status:'in_review',staff_reply:text});if(d.saved!==true)throw Error('Bozza non salvata. Riprova.');if(r){r.status='in_review';r.staff_reply=text;}notes.set(id,{ok:true,text:'Bozza salvata'});}
  else{const d=await post({action:'admin_service_review_send',id,staff_reply:text});if(d.sent!==true)throw Error(d.error||'Invio non confermato.');if(r){r.status='resolved';r.staff_reply=text;}drafts.delete(id);notes.set(id,{ok:true,text:'Risposta inviata a '+(d.recipient||'studente')});}}
 catch(error){notes.set(id,{ok:false,text:error.message});}
 finally{busy.delete(id);if(r)upsert(r,{force:true});else renderQueue();}}
document.addEventListener('input',e=>{const id=e.target?.dataset?.reviewDraft;if(id)drafts.set(id,e.target.value);});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-campus-review],[data-review-save],[data-review-send],[data-review-reset]');if(!b)return;const d=b.dataset,id=d.campusReview||d.reviewSave||d.reviewSend||d.reviewReset;
 if(!staffToken()||!/^[a-f0-9-]{36}$/.test(id)||busy.has(id))return;
 if(d.reviewReset!==undefined){const r=records.get(id);drafts.set(id,draftReply(r?.question));notes.delete(id);renderQueue();return;}
 b.disabled=true;void act(id,d.campusReview?'take':d.reviewSave?'save':'send');});
const loadScenario=window.loadScenario;window.loadScenario=function(){loadScenario();for(const row of records.values())upsert(row,{force:true});};
window.addEventListener('focus',()=>void refresh());window.addEventListener('DOMContentLoaded',()=>void refresh());
window.__caseyReviewQueue={upsert,refresh,act,drafts,notes,busy,records};})();
