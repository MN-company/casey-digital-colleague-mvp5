/* Private guest capability plus optional verified Supabase identity. No privileged keys. */
(() => {
 'use strict';
 const C=window.CASEY_CONFIG,endpoint=C.supabaseUrl+'/functions/v1/casey-beta',guestKey='casey-beta-guest-v1',authKey='casey-beta-auth-v1';
 let starting=null,refreshing=null;
 const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
 const guest=()=>read(localStorage,guestKey);
 const auth=()=>read(sessionStorage,authKey);
 async function refresh(){const a=auth();if(!a||a.expires_at>Date.now()+60000)return;if(!refreshing)refreshing=(async()=>{const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});const d=await r.json();if(!r.ok){sessionStorage.removeItem(authKey);throw Error('Accedi di nuovo via email. Le conversazioni restano salvate.');}saveAuth(d);})().finally(()=>{refreshing=null;});await refreshing;}
 function saveAuth(d){if(!d.access_token||!d.refresh_token)throw Error('Accesso non valido');sessionStorage.setItem(authKey,JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+d.expires_in*1000}));}
 async function call(action,body={}){
  if(action!=='email')await refresh();const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':guest()?.token||'','x-student-token':auth()?.access_token||''},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(60000)});
  const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Collegamento non disponibile'),{status:r.status,code:d.code});return d;
 }
 async function start(){if(guest()?.token){try{return await call('state');}catch(e){if(e.status!==401||guest()?.verified)throw e;localStorage.removeItem(guestKey);}}if(!starting)starting=call('start').then(d=>{localStorage.setItem(guestKey,JSON.stringify({token:d.token,verified:false}));return d;}).finally(()=>{starting=null;});return starting;}
 async function link(){await start();const d=await call('link');const g=guest();localStorage.setItem(guestKey,JSON.stringify({...g,verified:true}));return d;}
 async function verify(email,code){const r=await fetch(C.supabaseUrl+'/auth/v1/verify',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,token:code,type:'email'})});const d=await r.json();if(!r.ok)throw Error('Codice non valido o scaduto');saveAuth(d);return link();}
 async function callback(){const p=new URLSearchParams(location.hash.slice(1));if(!p.has('access_token'))return false;history.replaceState(null,'',location.pathname+location.search);saveAuth({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:Number(p.get('expires_in')||3600)});await link();return true;}
 async function logout(){const a=auth();sessionStorage.removeItem(authKey);if(guest()?.verified)localStorage.removeItem(guestKey);window.CaseyDialogue?.clear();if(a)await fetch(C.supabaseUrl+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:C.publishableKey,Authorization:'Bearer '+a.access_token}}).catch(()=>{});}
 window.CaseyBeta=Object.freeze({start,call,guest,auth,link,verify,callback,logout,refresh,async turn(message,id=crypto.randomUUID()){await start();return call('turn',{message,request_id:id});}});
})();
