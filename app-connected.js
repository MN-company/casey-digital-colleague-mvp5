/* Native app conversation adapter. Protected operations remain in the authenticated client. */
(() => {
 'use strict';
 const config = window.CASEY_CONFIG;
 let token = '', pending = null;
 async function call(action, body = {}) {
  const response = await fetch(config.apiUrl, {
   method: 'POST', headers: {'Content-Type': 'application/json', apikey: config.publishableKey, 'x-session-token': token},
   body: JSON.stringify({action, ...body}), signal: AbortSignal.timeout(45000)
  });
  const data = await response.json();
  if (!response.ok) { if (response.status === 401) token = ''; throw Error(data.error || 'Collegamento non disponibile'); }
  return data;
 }
 async function session() {
  if (token) return;
  if (!pending) pending = call('session').then(data => { token = data.token; }).finally(() => { pending = null; });
  await pending;
 }
 const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.CaseyApp = Object.freeze({async answer(message, messages = []) {
  try {
   const classification = await window.HandoffAPI.call('classify', {message});
   if (classification.route !== 'public') return {
    text: 'Per dati personali, richieste e appuntamenti accedi al tuo account. Gli orari e le conferme saranno verificati dal backend.',
    acts: [{l: 'Accedi a Casey', a: 'account', c: 'pri'}], keep: true
   };
   await session();
   const history = messages.filter(m => ['me','user','casey','assistant'].includes(m.from || m.role) && m.text)
    .slice(-10).map(m => ({role: ['me','user'].includes(m.from || m.role) ? 'user' : 'assistant', text: String(m.text).slice(0, 2000)}));
   const result = await call('turn', {message: String(message).slice(0,1000), history, language: 'it-IT'});
   const sources = (result.citations || []).map(s => s.title + (s.page ? ' · p. ' + s.page : '')).join(' · ');
   return {text: result.answer, ...(sources ? {html: '<p>' + escape(result.answer).replace(/\n/g,'<br>') + '</p><small>Fonti: ' + escape(sources) + '</small>'} : {}), keep: true};
  } catch (error) {
   return {text: 'Non riesco a collegarmi a Casey: ' + error.message + '. Riprova tra poco.', keep: true};
  }
 }});
})();
