/* Personal display profile and calendar use the verified account, never the staff token. */
(() => {
 'use strict';const C=window.CASEY_CONFIG,sessionKey='casey-personal-api-session-v1';let starting=null,cached=null,stamp='';
 const auth=()=>window.CaseyBeta?.auth?.()||window.HandoffAPI?.auth?.()||null;
 const changed=()=>Object.assign(Error('L’account è cambiato. Riapri il calendario.'),{status:401});
 async function session(){let s;try{s=JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch{}if(s?.expires>Date.now()+60000)return s.token;if(!starting)starting=fetch(C.settingsApiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'session'}),signal:AbortSignal.timeout(16000)}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);sessionStorage.setItem(sessionKey,JSON.stringify({token:d.token,expires:Date.now()+d.expires_in*1000}));return d.token;}).finally(()=>{starting=null;});return starting;}
 async function call(action,body={}){await window.CaseyBeta?.refresh?.();await window.HandoffAPI?.refresh?.();const jwt=auth()?.access_token;if(!jwt)throw Object.assign(Error('Accedi con la tua email per aprire il calendario personale.'),{status:401});const token=await session();if(auth()?.access_token!==jwt)throw changed();const r=await fetch(C.settingsApiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token,'x-student-token':jwt},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(auth()?.access_token!==jwt)throw changed();if(!r.ok)throw Object.assign(Error(d.error||'Servizio non disponibile'),{status:r.status});return d;}
 function publish(profile){cached=profile;window.__casey?.applyProfile?.(profile);window.dispatchEvent(new CustomEvent('casey:profile',{detail:profile}));return profile;}
 async function profile(force=false){const jwt=auth()?.access_token||'';if(!jwt){stamp='';return publish(null);}if(!force&&cached&&stamp===jwt)return cached;const r=await call('account_profile');stamp=jwt;return publish(r.profile);}
 async function updateName(display_name){const r=await call('account_profile_update',{display_name});stamp=auth()?.access_token||'';return publish(r.profile);}
 async function connect(){const r=await call('student_google_start',{return_to:location.origin+location.pathname});location.assign(r.state_cookie_url);}
 const callback=new URLSearchParams(location.hash.slice(1));const notice=callback.get('student_google_error')||(callback.has('student_google')?'Calendario Google collegato.':'' );
 if(callback.has('student_google')||callback.has('student_google_error')){callback.delete('student_google');callback.delete('student_google_error');history.replaceState(null,'',location.pathname+location.search+(callback.size?'#'+callback:''));}
 window.addEventListener('casey:account-change',e=>{if(e.detail?.signedOut){stamp='';publish(null);}});
 window.addEventListener('storage',e=>{if(['casey-beta-auth-v1','casey-beta-guest-v1'].includes(e.key)){cached=null;stamp='';publish(null);void profile().catch(()=>{});}});
 window.CaseyAccount=Object.freeze({auth,call,profile,updateName,connect,notice,clear(){stamp='';publish(null);}});
})();
