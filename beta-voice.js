/* Reuse the established PCM/WebSocket client with the isolated beta token endpoint. */
(() => {
 const original=window.CASEY_CONFIG;
 window.CASEY_CONFIG=Object.freeze({...original,liveTokenUrl:original.supabaseUrl+'/functions/v1/casey-beta-live'});
 window.HandoffAPI={session:()=>window.CaseyBeta.guest()?.token||''};
 window.CaseyAuth={get:()=>window.CaseyBeta.auth()};
 let lease=null,expiryTimer=null;
 window.addEventListener('casey:live-lease',event=>{
  lease=event.detail.request_id;clearTimeout(expiryTimer);
  expiryTimer=setTimeout(()=>{void window.CaseyLive?.stop('Il tempo di prova vocale è terminato. Continua a scrivere.');},Math.max(0,new Date(event.detail.expires_at).getTime()-Date.now()));
 });
 window.addEventListener('casey:live-state', e=>{if(e.detail.state==='idle'&&lease&&window.CaseyDialogue?.snapshot().length){void window.CaseyBeta.call('voice_save',{request_id:lease,context:window.CaseyDialogue.snapshot().slice(-100)}).catch(()=>{});}});
 window.CaseyBridge={liveSearchKnowledge:async query=>{if(!lease)return {verified:false,note:'Sessione vocale richiesta'};return window.CaseyBeta.call('knowledge',{query:String(query).slice(0,360),request_id:lease});},liveMobileHandoff:async()=>({status:'authentication_required',note:'Apri Account College e appuntamenti. Questa prova non abilita servizi personali.'})};
})();
