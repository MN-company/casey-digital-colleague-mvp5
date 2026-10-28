/* Reuse the established PCM/WebSocket client with the isolated beta token endpoint. */
(() => {
 const original=window.CASEY_CONFIG;
 window.CASEY_CONFIG=Object.freeze({...original,liveTokenUrl:original.supabaseUrl+'/functions/v1/casey-beta-live'});
 window.HandoffAPI={...window.HandoffAPI,session:()=>window.CaseyBeta.guest()?.token||''};
 window.CaseyAuth={get:()=>window.CaseyBeta.auth()};
 let lease=null,expiryTimer=null;
 window.addEventListener('casey:live-lease',event=>{
  if(event.detail.kind==='private')return;lease=event.detail.request_id;clearTimeout(expiryTimer);
  expiryTimer=setTimeout(()=>{void window.CaseyLive?.stop('La sessione vocale è terminata. Puoi riattivare il microfono oppure scrivere.');},Math.max(0,new Date(event.detail.expires_at).getTime()-Date.now()));
 });
 window.addEventListener('casey:live-state', e=>{if(e.detail.state==='idle'&&lease){const id=lease;lease=null;clearTimeout(expiryTimer);const context=window.CaseyDialogue?.snapshot()||[];void Promise.allSettled([...(context.length?[window.CaseyBeta.call('voice_save',{request_id:id,context:context.slice(-100)})]:[]),window.CaseyBeta.call('voice_end',{request_id:id})]);}});
 const bridge={liveSearchKnowledge:async query=>{if(!lease)return {verified:false,note:'Sessione vocale richiesta'};return window.CaseyBeta.call('knowledge',{query:String(query).slice(0,360),request_id:lease});},liveMobileHandoff:async()=>({status:'authentication_required',note:'Apri Account College e appuntamenti. Questa prova non abilita servizi personali.'})};
 window.CaseyBetaVoice={activate(){window.CaseyLiveContext={tokenUrl:original.supabaseUrl+'/functions/v1/casey-beta-live',session:()=>window.CaseyBeta.guest()?.token||'',auth:()=>window.CaseyBeta.auth()};window.CaseyBridge=bridge;}};
 window.CaseyBetaVoice.activate();
})();
