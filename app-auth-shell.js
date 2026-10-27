/* Pietro's visual shell, backed by the real account-owned conversation client. */
(() => {
 'use strict';const campus=location.pathname.endsWith('app-rossa.html');
 const hash=location.hash;history.replaceState(null,'',location.pathname+location.search);
 const sheet=document.getElementById('sheet'),inner=sheet.querySelector('.inner');
 const close=document.createElement('button');close.className='casey-sheet-close';close.type='button';close.setAttribute('aria-label','Chiudi Casey');close.textContent='×';
 const frame=document.createElement('iframe');frame.id='caseyFrame';frame.title='Casey — le tue conversazioni';frame.allow='microphone';
 let loaded=false;
 function open(){const splash=document.getElementById('splash');if(splash)splash.style.display='none';sheet.classList.remove('off');document.querySelector('.caseyb')?.setAttribute('aria-expanded','true');if(!loaded){frame.src='college.html?embedded=1'+(campus?'&theme=campus':'')+hash;loaded=true;}}
 function closeSheet(){sheet.classList.add('off');document.querySelector('.caseyb')?.setAttribute('aria-expanded','false');try{void frame.contentWindow?.CaseyVoiceSession?.stop();}catch{}}
 inner.replaceChildren(close,frame);close.onclick=closeSheet;
 window.addEventListener('casey:account-change',e=>{if(e.detail?.signedOut||e.detail?.identityChanged){closeSheet();frame.src='about:blank';loaded=false;}});
 window.openSheet=open;window.closeSheet=closeSheet;setTimeout(()=>document.getElementById('splash')?.classList.add('go'),800);
 if(hash.includes('handoff=')||new URLSearchParams(location.search).get('casey')==='1')open();
})();
