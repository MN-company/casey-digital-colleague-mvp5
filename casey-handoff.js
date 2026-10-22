/* Totem QR + phone context adapter. QR carries no identity, transcript, or auth credential. */
(() => {
 'use strict';
 const API=window.HandoffAPI;let poll=null,expiry=null,saveTimer=null,linkId=null;
 let ready=Promise.resolve();
 function clearPublic(){window.CaseyDialogue.clear();window.CaseyLive?.stop?.();window.resetDemo?.();document.getElementById('userInput').value='';document.getElementById('subtitleBox').textContent='Conversazione trasferita. Pronto per un nuovo studente.';}
 function close(){clearTimeout(expiry);clearInterval(poll);poll=null;const d=document.getElementById('handoffDialog');if(d?.open)d.close();document.getElementById('handoffQR')?.replaceChildren();linkId=null;}
 async function open(){
  if(API.mobile)return {status:'already_on_mobile'};
  await window.CaseyLive?.stop?.();
  const d=document.getElementById('handoffDialog');if(!d.open)d.showModal();document.getElementById('handoffNumber').focus();
  return {status:'mobile_handoff_required',message:'Inserisci la matricola sul totem e scansiona il QR. Accedi soltanto sul telefono.'};
 }
 async function issue(e){e.preventDefault();const feedback=document.getElementById('handoffFeedback'),button=e.target.querySelector('button');button.disabled=true;closeTimers();document.getElementById('handoffQR').replaceChildren();
  try{
   const context=window.CaseyDialogue.snapshot();const r=await API.call('issue',{student_number:document.getElementById('handoffNumber').value.trim(),context});linkId=r.id;
   const url=new URL('college.html',location.href);url.hash='handoff='+r.token;
   const qr=qrcode(0,'M');qr.addData(url.href);qr.make();
   const canvas=document.createElement('canvas'),n=qr.getModuleCount(),scale=Math.max(3,Math.floor(300/(n+8)));canvas.width=canvas.height=(n+8)*scale;canvas.setAttribute('aria-label','QR per continuare sul telefono');
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#11152c';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);
   document.getElementById('handoffQR').append(canvas);feedback.textContent='Scansiona entro 2 minuti e accedi sul telefono. Il QR funziona una sola volta.';
   expiry=setTimeout(()=>{closeTimers();document.getElementById('handoffQR').replaceChildren();feedback.textContent='QR scaduto. Generane uno nuovo.';},r.expires_in*1000);
   poll=setInterval(async()=>{try{const s=await API.call('status',{id:r.id});if(linkId!==r.id)return;if(s.consumed){close();clearPublic();document.getElementById('handoffNumber').value='';}else if(s.expired){closeTimers();document.getElementById('handoffQR').replaceChildren();feedback.textContent='QR scaduto. Generane uno nuovo.';}}catch{feedback.textContent='Verifica connessione: il QR scade comunque dopo 2 minuti.';}},3000);
  }catch(err){feedback.textContent=err.message;}finally{button.disabled=false;}
 }
 function closeTimers(){clearTimeout(expiry);clearInterval(poll);poll=null;}
 if(API.mobile){
  document.documentElement.classList.add('handoff-mobile');
  ready=API.call('load').then(data=>{window.CaseyDialogue.clear();for(const t of data.context)window.CaseyDialogue.append(t.role,t.text);}).catch(()=>{location.replace('college.html');throw new Error('Accedi dalla pagina College');});
  window.addEventListener('casey:dialogue',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>API.call('save',{context:window.CaseyDialogue.snapshot()}).catch(()=>{const box=document.getElementById('handoffSaveStatus');if(box)box.textContent='Salvataggio non riuscito: verifica la connessione.';}),500);});
 }else{
  document.addEventListener('DOMContentLoaded',()=>{
   const d=document.createElement('dialog');d.id='handoffDialog';d.setAttribute('aria-labelledby','handoffTitle');
   d.innerHTML='<h2 id="handoffTitle">Continua sul tuo telefono</h2><p>La matricola indica a chi trasferire il contesto. L’identità verrà verificata dopo il login sul telefono.</p><form id="handoffForm"><label for="handoffNumber">Matricola di prova</label><input id="handoffNumber" autocomplete="off" pattern="[A-Za-z0-9-]{3,24}" required maxlength="24"><button type="submit">Genera QR sicuro</button></form><div id="handoffQR"></div><p id="handoffFeedback" role="status"></p><button id="handoffClose" type="button">Chiudi</button>';
   document.body.append(d);document.getElementById('handoffForm').addEventListener('submit',issue);document.getElementById('handoffClose').onclick=close;d.addEventListener('cancel',close);
   const button=document.createElement('button');button.id='handoffStart';button.className='handoff-start';button.textContent='Continua sul telefono · QR';button.onclick=open;document.querySelector('header').append(button);
   const badge=document.createElement('p');badge.className='handoff-banner';badge.textContent='Casey 6.0 Handoff · Preview isolata · account e dati di prova';document.querySelector('header').after(badge);
  });
 }
 async function beforeTurn(text){if(API.mobile)return false;const decision=await API.call('classify',{message:text});if(decision.personal){window.CaseyDialogue.append('user',text);await open();return true;}return false;}
 window.CaseyHandoff={open,beforeTurn,ready};
})();
