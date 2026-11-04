/* Independent presentation windows. No account tokens or chat contents are sent between them. */
(() => {
 'use strict';
 const url=new URL(location.href);
 const vista=url.searchParams.get('vista');let mode=vista==='totem'?'casey':vista==='lim'?'calendar':['casey','calendar'].includes(url.searchParams.get('view'))?url.searchParams.get('view'):'overview';
 let hadFullscreen=false;
 const tools=document.createElement('nav');tools.className='presentation-tools';tools.setAttribute('aria-label','Controlli presentazione');
 tools.innerHTML='<button type="button" id="presentationFullscreen">Schermo intero</button><a href="'+viewUrl('calendar')+'" target="casey-calendar" rel="noopener" id="presentationCalendar">Calendario</a><a href="settings.html" target="casey-settings" rel="noopener">Impostazioni</a>';
 document.body.append(tools);
 // Office/Student switch for the full-screen calendar: mirrors the header segmented control.
 function syncCalendarSwitch(){
  const box=document.getElementById('calendarViewSwitch');if(!box)return;
  for(const view of ['OFFICE','STUDENT']){const selected=document.getElementById('pv-'+view)?.getAttribute('aria-selected')==='true';const b=document.getElementById('calview-'+view);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
 }
 function chooseCalendarView(view){window.setView(view);window.setTab('CAL');syncCalendarSwitch();}
 function mountCalendarSwitch(){
  if(document.getElementById('calendarViewSwitch'))return syncCalendarSwitch();
  const box=document.createElement('div');box.className='seg calendar-view-switch';box.id='calendarViewSwitch';box.setAttribute('role','tablist');box.setAttribute('aria-label','Punto di vista calendario');
  box.innerHTML='<button type="button" id="calview-OFFICE" role="tab" aria-selected="true">Ufficio</button><button type="button" id="calview-STUDENT" role="tab" aria-selected="false">Studente</button>';
  for(const view of ['OFFICE','STUDENT'])box.querySelector('#calview-'+view).onclick=()=>chooseCalendarView(view);
  box.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
   const current=document.getElementById('pv-STUDENT')?.getAttribute('aria-selected')==='true'?'STUDENT':'OFFICE';
   const next=event.key==='Home'?'OFFICE':event.key==='End'?'STUDENT':current==='OFFICE'?'STUDENT':'OFFICE';
   chooseCalendarView(next);document.getElementById('calview-'+next).focus();
  });
  (document.querySelector('.top .in')||document.body).append(box);syncCalendarSwitch();
 }
 function applyMode(value){
  mode=value;document.body.classList.toggle('show',mode==='casey');document.body.classList.toggle('calendar-only',mode==='calendar');
  if(mode==='calendar'){window.setView('OFFICE');window.setTab('CAL');mountCalendarSwitch();document.title='Casey · Calendario';}
  else document.getElementById('calendarViewSwitch')?.remove();
  if(mode!=='calendar')document.title=mode==='casey'?'Casey · Presentazione':'Casey - your digital colleague';
  const next=new URL(location.href);if(mode==='overview')next.searchParams.delete('view');else next.searchParams.set('view',mode);history.replaceState(null,'',next);
 }
 // Separate windows keep only the demo/free flags of the current page; nothing else is forwarded.
 function viewUrl(view){
  const target=new URL('index.html',location.href);target.searchParams.set('view',view);
  for(const key of ['demo','libero']){const value=url.searchParams.get(key);if(value!==null)target.searchParams.set(key,value);}
  return target.href;
 }
 function openWindow(view,name,title,hint){
  const opened=window.open(viewUrl(view),name,'popup=yes,width=1150,height=850,resizable=yes,scrollbars=yes');
  if(!opened){window.toast(title,hint);return false;}
  try{opened.opener=null;}catch{/* No shared access is needed. */}
  return true;
 }
 function openCalendar(event){event?.preventDefault();return openWindow('calendar','casey-calendar','Apri il calendario','Il browser ha bloccato la seconda finestra. Consenti i popup oppure usa il link Calendario separato.');}
 function openCasey(event){event?.preventDefault();return openWindow('casey','casey-totem','Apri Casey','Il browser ha bloccato la seconda finestra. Consenti i popup per aprire Casey.');}
 async function fullscreen(){
  applyMode('casey');
  if(document.fullscreenElement)return;
  try{if(!document.documentElement.requestFullscreen)throw Error();await document.documentElement.requestFullscreen();hadFullscreen=true;}
  catch{window.toast('Vista Casey aperta','Per nascondere anche la barra del browser usa il comando Schermo intero del browser.');}
 }
 window.toggleShow=()=>{if(mode==='casey'){applyMode('overview');if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}else void fullscreen();};
 // Opening a popup consumes browser activation; fullscreen has its own explicit button.
 document.getElementById('startDemo').onclick=openCasey;
 const calendarLink=document.getElementById('calendarLink');calendarLink.onclick=openCalendar;calendarLink.href=viewUrl('calendar');
 document.getElementById('presentationCalendar').onclick=openCalendar;
 document.getElementById('presentationFullscreen').onclick=()=>void fullscreen();
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement){hadFullscreen=true;document.getElementById('presentationFullscreen').hidden=true;}else{document.getElementById('presentationFullscreen').hidden=false;if(hadFullscreen){hadFullscreen=false;applyMode('overview');}}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode==='casey'&&!document.fullscreenElement)applyMode('overview');});
 document.querySelector('.exit').textContent='Torna alla vista completa · Esc';
 window.__caseyPresentation={applyMode,syncCalendarSwitch,viewUrl};
 document.addEventListener('DOMContentLoaded',()=>applyMode(mode));
})();
