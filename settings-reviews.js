/* Student Office requests in the staff console: list, status/reply update, delete after confirm(). textContent only. */
(()=>{'use strict';
const STATUS=[['in_review','In revisione'],['resolved','Risolta'],['closed','Chiusa']],LABEL={open:'Da prendere in carico',in_review:'In revisione',resolved:'Risolta',closed:'Chiusa'};
const rome=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};
const firstLine=q=>String(q||'').split('\n').map(x=>x.trim()).find(Boolean)||'';
function mount(box,{call,ask=m=>window.confirm(m)}){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 async function load(){let r;try{r=await call('admin_service_reviews',{include_test:true});}catch(e){box.replaceChildren(el('p','sync-empty','Richieste non disponibili: '+e.message));return;}
  const rows=r.reviews||[];box.replaceChildren();if(!rows.length){box.append(el('p','sync-empty','Nessuna richiesta Student Office.'));return;}
  for(const item of rows)box.append(row(item));}
 function row(item){const wrap=el('div','sync-item service-review'),left=el('div'),title=el('strong','',item.subject||'Richiesta'),sub=el('small','',[rome(item.created_at),LABEL[item.status]||item.status,firstLine(item.question)].filter(Boolean).join(' · '));
  left.append(title);if(item.is_test)left.append(' ',el('span','badge-warning','test'));left.append(el('br'),sub);
  const form=el('div','service-review-form'),select=el('select'),reply=el('textarea'),save=el('button','primary-btn','Salva'),del=el('button','danger-btn','Elimina'),msg=el('p','help-note');
  select.setAttribute('aria-label','Stato della richiesta');for(const [v,l] of STATUS){const o=el('option','',l);o.value=v;select.append(o);}select.value=STATUS.some(([v])=>v===item.status)?item.status:'in_review';
  reply.rows=3;reply.maxLength=4000;reply.value=item.staff_reply||'';reply.setAttribute('aria-label','Risposta dello staff');save.type=del.type='button';msg.setAttribute('role','status');
  const busy=on=>{save.disabled=del.disabled=on;};
  save.addEventListener('click',async()=>{busy(true);msg.textContent='';try{const r=await call('admin_service_review_update',{id:item.id,status:select.value,staff_reply:reply.value});if(r.saved!==true)throw Error('modifica non salvata');msg.textContent='Salvato.';await load();}catch(e){msg.textContent='Errore: '+e.message;}finally{busy(false);}});
  del.addEventListener('click',async()=>{if(!ask('Eliminare definitivamente questa richiesta?'))return;busy(true);msg.textContent='';try{const r=await call('admin_service_review_delete',{id:item.id});if(r.deleted!==true)throw Error('richiesta non eliminata');await load();}catch(e){msg.textContent='Errore: '+e.message;}finally{busy(false);}});
  form.append(select,reply,save,del,msg);wrap.append(left,form);return wrap;}
 return {load};}
window.CaseyServiceReviews=Object.freeze({mount});})();
