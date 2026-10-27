(() => {
 const mic=document.getElementById('micBtn');
 const wave='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg>',stop='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
 CaseyVoiceSession.configure({prepare:async()=>{const r=await HandoffAPI.call('session');HandoffAPI.saveSession(r.session_token);},send:async text=>{const before=muted;muted=true;try{return await window.send(text);}finally{muted=before;}},notice:text=>{document.getElementById('capText').textContent=text;}});
 window.toggleListen=()=>CaseyVoiceSession.state==='idle'?void CaseyVoiceSession.start({microphone:false}):void CaseyVoiceSession.stop();
 window.toggleMic=()=>CaseyVoiceSession.state==='idle'?void CaseyVoiceSession.start():void CaseyVoiceSession.stop();
 function paint(){const listen=document.getElementById('listenCaseyBtn');if(listen)listen.textContent=CaseyVoiceSession.state==='idle'?'Ascolta':'Termina voce';const on=CaseyVoiceSession.state!=='idle';mic.innerHTML=on?stop:wave;mic.classList.toggle('on',on);mic.setAttribute('aria-label',on?'Termina conversazione vocale':'Parla con Casey');mic.title=mic.getAttribute('aria-label');mic.disabled=false;}
 window.addEventListener('casey:voice',paint);window.addEventListener('DOMContentLoaded',paint);
 new MutationObserver(()=>{const text=document.getElementById('subtitleBox').textContent;if(text&&CaseyVoiceSession.state==='live')document.getElementById('capText').textContent=text;}).observe(document.getElementById('subtitleBox'),{childList:true,characterData:true,subtree:true});
})();
