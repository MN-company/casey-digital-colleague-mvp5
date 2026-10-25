/* Independent presentation windows. No account tokens or chat contents are sent between them. */
(() => {
 'use strict';
 const url=new URL(location.href);
 let mode=['casey','calendar'].includes(url.searchParams.get('view'))?url.searchParams.get('view'):'overview';
 let hadFullscreen=false;
 const tools=document.createElement('nav');tools.className='presentation-tools';tools.setAttribute('aria-label','Controlli presentazione');
 tools.innerHTML='<button type="button" id="presentationFullscreen">Schermo intero</button><a href="index.html?view=calendar" target="casey-calendar" rel="noopener" id="presentationCalendar">Calendario</a><a href="settings.html" target="casey-settings" rel="noopener">Impostazioni</a>';
 document.body.append(tools);
 function applyMode(value){
  mode=value;document.body.classList.toggle('show',mode==='casey');document.body.classList.toggle('calendar-only',mode==='calendar');
  if(mode==='calendar'){window.setView('OFFICE');window.setTab('CAL');document.title='Casey · Calendario';}
  else document.title=mode==='casey'?'Casey · Presentazione':'Casey 6.0 — Digital Colleague';
  const next=new URL(location.href);if(mode==='overview')next.searchParams.delete('view');else next.searchParams.set('view',mode);history.replaceState(null,'',next);
 }
 function openCalendar(event){
  event?.preventDefault();const target=new URL('index.html?view=calendar',location.href);
  const calendar=window.open(target.href,'casey-calendar','popup=yes,width=1150,height=850,resizable=yes,scrollbars=yes');
  if(!calendar){window.toast('Apri il calendario','Il browser ha bloccato la seconda finestra. Consenti i popup oppure usa il link Calendario separato.');return false;}
  try{calendar.opener=null;}catch{/* No shared access is needed. */}
  return true;
 }
 async function fullscreen(){
  applyMode('casey');
  if(document.fullscreenElement)return;
  try{if(!document.documentElement.requestFullscreen)throw Error();await document.documentElement.requestFullscreen();hadFullscreen=true;}
  catch{window.toast('Vista Casey aperta','Per nascondere anche la barra del browser usa il comando Schermo intero del browser.');}
 }
 window.toggleShow=()=>{if(mode==='casey'){applyMode('overview');if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}else void fullscreen();};
 // Opening a popup consumes browser activation; fullscreen has its own explicit button.
 document.getElementById('startDemo').onclick=()=>{openCalendar();applyMode('casey');};
 document.getElementById('calendarLink').onclick=openCalendar;
 document.getElementById('presentationCalendar').onclick=openCalendar;
 document.getElementById('presentationFullscreen').onclick=()=>void fullscreen();
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement){hadFullscreen=true;document.getElementById('presentationFullscreen').hidden=true;}else{document.getElementById('presentationFullscreen').hidden=false;if(hadFullscreen){hadFullscreen=false;applyMode('overview');}}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode==='casey'&&!document.fullscreenElement)applyMode('overview');});
 document.querySelector('.exit').textContent='Torna alla vista completa · Esc';
 document.addEventListener('DOMContentLoaded',()=>applyMode(mode));
})();
