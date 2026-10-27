/* Native visual shells share the individually metered beta backend. */
(() => {
 'use strict';
 const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.CaseyApp = Object.freeze({async answer(message) {
  try {
   const result=await window.CaseyBeta.turn(String(message).slice(0,1000));
   const sources=(result.citations||[]).map(s=>s.title+(s.page?' · p. '+s.page:'')).join(' · ');
   return {text:result.answer,...(sources?{html:'<p>'+escape(result.answer).replace(/\n/g,'<br>')+'</p><small>Fonti: '+escape(sources)+'</small>'}:{}),...(result.mode==='account_required'?{acts:[{l:'Accedi a College',a:'account',c:'pri'}]}:{}),keep:true};
  }catch(error){return {text:error.message+' Per salvare la prova con email e gestire il tuo accesso, apri “Prova Casey”.',html:'<p>'+escape(error.message)+'</p><a href="prova.html">Prova Casey · accesso e conversazioni</a>',keep:true};}
 }});
})();
