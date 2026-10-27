/* Private guest capabilities. Email verification must match a login initiated in this browser. */
(() => {
 'use strict';
 const C=window.CASEY_CONFIG,endpoint=C.supabaseUrl+'/functions/v1/casey-beta',guestKey='casey-beta-guest-v1',authKey='casey-beta-auth-v1',flowKey='casey-beta-login-flow-v2';
 const incoming=new URLSearchParams(location.hash.slice(1));
 if(incoming.has('access_token')||incoming.has('token_hash'))history.replaceState(null,'',location.pathname+location.search);
 let starting=null,refreshing=null,epoch=0;
 const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
 const guest=()=>read(localStorage,guestKey),auth=()=>read(sessionStorage,authKey);
 const changed=()=>Error('L’accesso è cambiato. Riprova dalla sessione attuale.');
 function pending(email){const flow=read(sessionStorage,flowKey);if(!flow||flow.expires<Date.now()||flow.guest!==guest()?.token||(email&&flow.email!==email.trim().toLowerCase()))throw Error('Richiedi un nuovo codice su questo dispositivo');return flow;}
 function saveAuth(d){if(!d.access_token||!d.refresh_token)throw Error('Accesso non valido');sessionStorage.setItem(authKey,JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+d.expires_in*1000}));}
 async function refresh(){const a=auth();if(!a||a.expires_at>Date.now()+60000)return;const generation=epoch;if(!refreshing)refreshing=(async()=>{const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});const d=await r.json();if(generation!==epoch)throw changed();if(!r.ok){sessionStorage.removeItem(authKey);throw Error('Accedi di nuovo via email. Le conversazioni restano salvate.');}saveAuth(d);})().finally(()=>{refreshing=null;});await refreshing;}
 async function call(action,body={}){
  const generation=epoch;if(action!=='email')await refresh();if(generation!==epoch)throw changed();
  if(action==='email'){const email=String(body.email||'').trim().toLowerCase(),state=crypto.randomUUID();sessionStorage.setItem(flowKey,JSON.stringify({email,state,guest:guest()?.token,expires:Date.now()+15*60000}));body={...body,email,state};}
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':guest()?.token||'','x-student-token':auth()?.access_token||''},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(60000)});
  const d=await r.json();if(generation!==epoch)throw changed();if(!r.ok)throw Object.assign(Error(d.error||'Collegamento non disponibile'),{status:r.status,code:d.code});return d;
 }
 async function start(){if(guest()?.token){try{return await call('state');}catch(e){if(e.status!==401||guest()?.verified)throw e;localStorage.removeItem(guestKey);}}if(!starting)starting=call('start').then(d=>{localStorage.setItem(guestKey,JSON.stringify({token:d.token,verified:false}));return d;}).finally(()=>{starting=null;});return starting;}
 async function link(){const flow=pending();await start();const d=await call('link',{state:flow.state});const g=guest();localStorage.setItem(guestKey,JSON.stringify({...g,verified:true}));sessionStorage.removeItem(flowKey);return d;}
 async function verify(email,code){pending(email);const generation=epoch;const r=await fetch(C.supabaseUrl+'/auth/v1/verify',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,token:code,type:'email'})});const d=await r.json();if(generation!==epoch)throw changed();if(!r.ok)throw Error('Codice non valido o scaduto');saveAuth(d);return link();}
 async function callback(){if(incoming.has('access_token'))throw Error('Link non valido per questa sessione. Richiedi un nuovo codice.');if(!incoming.has('token_hash'))return false;const flow=pending();if(incoming.get('state')!==flow.state)throw Error('Link di accesso non richiesto su questo dispositivo');const generation=epoch;const r=await fetch(C.supabaseUrl+'/auth/v1/verify',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({token_hash:incoming.get('token_hash'),type:'email'})});const d=await r.json();if(generation!==epoch)throw changed();if(!r.ok)throw Error('Link non valido o scaduto');saveAuth(d);await link();return true;}
 async function logout(){++epoch;const a=auth();sessionStorage.removeItem(authKey);sessionStorage.removeItem(flowKey);if(guest()?.verified)localStorage.removeItem(guestKey);window.CaseyDialogue?.clear();if(a)await fetch(C.supabaseUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:C.publishableKey,Authorization:'Bearer '+a.access_token}}).catch(()=>{});}
 window.addEventListener('storage',e=>{if(e.key===guestKey){++epoch;sessionStorage.removeItem(authKey);sessionStorage.removeItem(flowKey);window.CaseyDialogue?.clear();}});
 window.CaseyBeta=Object.freeze({start,call,guest,auth,link,verify,callback,logout,refresh,async turn(message,id=crypto.randomUUID()){await start();return call('turn',{message,request_id:id});}});
})();
