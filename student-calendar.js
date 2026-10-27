/* Student-only calendar surface: no staff credential, no invented or office fallback events. */
(() => {
 'use strict';const A=window.CaseyAccount;let dialog=null;
 const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const n=element('button',text);n.type='button';n.onclick=()=>void fn().catch(e=>{status.textContent=e.message;});return n;};
 let status;
 async function mount(host){
  host.replaceChildren();const heading=element('h2','Il mio account e calendario');host.append(heading);
  status=element('p',A.notice,'personal-status');status.setAttribute('role','status');host.append(status);const statusNode=status;
  const content=element('div');host.append(content);
  try{
   const p=await A.profile();if(!p){content.append(element('p','Accedi con la tua email e il codice ricevuto. Il calendario Student Office è separato e rimane riservato allo staff.'));const a=element('a','Accedi nell’app College');a.href='app-blu.html?prova=1&account=1';content.append(a);return;}
   content.append(element('p',`${p.display_name||'Il tuo account'} · ${p.email}`));
   const form=element('form'),label=element('label','Come ti chiami?'),name=element('input');name.value=p.display_name||'';name.maxLength=80;name.required=true;name.setAttribute('aria-label','Il tuo nome');const save=element('button','Salva nome');save.type='submit';form.append(label,name,save);form.onsubmit=async e=>{e.preventDefault();try{await A.updateName(name.value);statusNode.textContent='Nome salvato. Casey ti riconoscerà con questo nome.';}catch(err){statusNode.textContent=err.message;}};content.append(form);
   const controls=element('div','','personal-actions');controls.append(button('Collega il mio Google Calendar',()=>A.connect()));const back=element('a','Impostazioni');back.href='settings.html#student-calendar';controls.append(back);content.append(controls);
   content.append(element('p','Casey legge solo gli eventi del calendario che scegli. Questo collegamento personale non modifica il calendario Student Office e non abilita l’accesso a voti o altri dati universitari.','personal-note'));
   const month=element('input');month.type='month';month.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit'}).format(new Date());if(!/^\d{4}-\d{2}$/.test(month.value))month.value=new Date().toISOString().slice(0,7);month.setAttribute('aria-label','Mese del tuo calendario');content.append(month);
   const grid=element('div','','personal-calendar');grid.setAttribute('aria-label','Calendario personale');content.append(grid);
   let revision=0;async function draw(){const mine=++revision,selectedMonth=month.value;grid.replaceChildren();const r=await A.call('student_live_calendar',{month:selectedMonth});if(mine!==revision)return;statusNode.textContent=r.needs_selection?'L’account collegato selezionava il calendario Student Office. Scegli un calendario personale diverso.':r.google_connected?'Il tuo Google Calendar è collegato: '+r.google_email:'Il tuo Google Calendar non è ancora collegato. Nessun calendario dell’ufficio viene mostrato al suo posto.';
    const events=[...(r.events||[]),...(r.bookings||[])],y=Number(month.value.slice(0,4)),m=Number(month.value.slice(5)),days=new Date(y,m,0).getDate(),offset=(new Date(y,m-1,1).getDay()+6)%7;
    for(const day of ['L','M','M','G','V','S','D'])grid.append(element('b',day));for(let i=0;i<offset;i++)grid.append(element('div'));
    for(let d=1;d<=days;d++){const cell=element('div','','personal-day');cell.append(element('b',String(d)));const date=month.value+'-'+String(d).padStart(2,'0');for(const ev of events.filter(ev=>(ev.start.includes('T')?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ev.start)):ev.start)===date)){const item=element('span',ev.title);item.title=ev.title;cell.append(item);}grid.append(cell);}
   }
   month.onchange=()=>void draw().catch(e=>{grid.replaceChildren();statusNode.textContent=e.message;});
   const s=await A.call('student_google_status');if(s.connected){const list=await A.call('student_google_calendars');const label=element('label','Calendario personale da mostrare'),select=element('select');select.setAttribute('aria-label','Scegli calendario personale');for(const c of list.calendars){const option=element('option',c.title+(c.office?' · Student Office, non selezionabile':''));option.value=c.id;option.disabled=c.office;option.selected=c.selected;select.append(option);}content.append(label,select,button('Usa questo calendario',async()=>{await A.call('student_google_calendar',{calendar_id:select.value});await draw();}));}
   await draw();
  }catch(e){if(e.status===401)content.replaceChildren();statusNode.textContent=e.message;const a=element('a','Accedi nell’app College');a.href='app-blu.html?prova=1&account=1';content.append(a);}
 }
 async function open(){if(!dialog){dialog=element('dialog','','personal-dialog');dialog.setAttribute('aria-label','Il mio account e calendario');document.body.append(dialog);}dialog.replaceChildren();const close=element('button','Chiudi');close.type='button';close.onclick=()=>dialog.close();const host=element('section');dialog.append(close,host);dialog.showModal();await mount(host);}
 window.CaseyPersonalCalendar=Object.freeze({open});
 window.addEventListener('storage',e=>{if(e.key==='casey-beta-auth-v1')dialog?.close();});
 const host=document.getElementById('studentAccountSettings');if(host)void mount(host);else if(A.notice)document.addEventListener('DOMContentLoaded',()=>void open());
})();
