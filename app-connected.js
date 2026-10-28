/* Native visual shells share the individually metered beta backend. */
(() => {
 'use strict';
 const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.CaseyApp = Object.freeze({async answer(message) {
  const wait=window.setTimeout?.(()=>{const n=window.document?.getElementById('caseyLiveStatus');if(n)n.textContent='Sto ancora cercando nelle fonti…';},6000);
  try {
   if(!window.CaseyNativeHandoff?.active&&window.HandoffAPI?.auth()&&(sessionStorage.getItem('casey-handoff-v2-pending')||sessionStorage.getItem('casey-handoff-v2-chat-id')))await window.CaseyNativeHandoff.open();
   const campus=await window.CaseyCampusCases?.handle(String(message));if(!campus?.matched&&window.CaseyNativeHandoff?.active)return await window.CaseyNativeHandoff.answer(String(message));
   if(campus?.matched&&window.CaseyNativeHandoff?.active)await window.CaseyNativeHandoff.recordExchange?.(String(message),campus.answer);
   const result=campus?.matched?campus:await window.CaseyBeta.turn(String(message));
   const sources=(result.citations||[]).map(s=>s.title+(s.page?' · p. '+s.page:'')).join(' · ');
   return {text:result.answer,...(sources?{html:'<p>'+escape(result.answer).replace(/\n/g,'<br>')+'</p><small>Fonti: '+escape(sources)+'</small>'}:{}),...(result.mode==='account_required'?{acts:[{l:'Continua nella chat personale',a:'private-chat',c:'pri'}]}:{}),keep:true};
  }catch(error){const message=window.CaseyErrors?.message(error)||'Casey non è raggiungibile in questo momento. Riprova tra poco.';const auth=[401,403].includes(error.status);return {text:message,html:'<p>'+escape(message)+'</p><small>Puoi scrivere allo Student Office: <a href="mailto:student.office@h-farm.com">student.office@h-farm.com</a></small>',...(auth?{acts:[{l:'Account',a:'account'}]}:{}),keep:true};}finally{window.clearTimeout?.(wait);const n=window.document?.getElementById('caseyLiveStatus');if(n)n.textContent='';}
 }});
})();
