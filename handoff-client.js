/* Shared API adapter; credentials stay in this tab, and only the phone has Auth. */
(() => {
 'use strict';
 const C=window.CASEY_CONFIG;
 const mobile=new URLSearchParams(location.search).get('mobile')==='1';
 const sessionKey=mobile||(location.pathname.endsWith('/college.html')||location.pathname.endsWith('/app-blu.html')||location.pathname.endsWith('/app-rossa.html'))?'casey-handoff-v2-phone-session':'casey-handoff-v2-kiosk-session';
 const personal=mobile||['/college.html','/app-blu.html','/app-rossa.html','/settings.html'].some(p=>location.pathname.endsWith(p));
 const authKey='casey-beta-auth-v1';
 try{const legacy=sessionStorage.getItem('casey-handoff-v2-phone-auth');if(!sessionStorage.getItem(authKey)&&legacy)sessionStorage.setItem(authKey,legacy);sessionStorage.removeItem('casey-handoff-v2-phone-auth');}catch{}
 function auth(){if(!personal)return null;try{const a=JSON.parse(sessionStorage.getItem(authKey)||'null');return a?.expires_at>Date.now()+30000?a:null;}catch{return null;}}
 function session(){try{return JSON.parse(sessionStorage.getItem(sessionKey)||'null')?.token||'';}catch{return '';}}
 let refreshing=null,generation=0;
 function invalidateAuth(){generation++;refreshing=null;}
 async function refresh(){if(!personal)return;if(auth())return;let a;try{a=JSON.parse(sessionStorage.getItem(authKey)||'null');}catch{}if(!a?.refresh_token)return;if(refreshing)return refreshing;const started=generation;refreshing=(async()=>{const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token}),signal:AbortSignal.timeout(16000)});const d=await (window.CaseyErrors?.json(r)||r.json());if(started!==generation||JSON.parse(sessionStorage.getItem(authKey)||'null')?.refresh_token!==a.refresh_token)throw Object.assign(new Error('Accesso cambiato'),{status:401});if(!r.ok)throw Object.assign(new Error('Accedi di nuovo. La conversazione è salvata.'),{status:401});window.CaseyAuth?.clear();sessionStorage.setItem(authKey,JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token,email:d.user.email,user_id:d.user.id,expires_at:Date.now()+d.expires_in*1000}));})().finally(()=>{refreshing=null;});return refreshing;}
 async function call(action,body={},renew=true){
  const started=generation;await refresh();if(started!==generation)throw Object.assign(new Error('Accesso cambiato'),{status:401});
  if(!session()&&!['scan','claim','restore','list','session','create'].includes(action)){const r=await call('session');saveSession(r.session_token);}
  const identity=auth()?.email||auth()?.access_token||'';
  const r=await fetch(C.handoffUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':session(),'x-student-token':auth()?.access_token||'','x-casey-session-token':mobile||(location.pathname.endsWith('/college.html')||location.pathname.endsWith('/app-blu.html')||location.pathname.endsWith('/app-rossa.html'))?'':JSON.parse(sessionStorage.getItem(C.sessionStorageKey)||'null')?.token||''},body:JSON.stringify({action,chat_id:sessionStorage.getItem('casey-handoff-v2-chat-id'),...body}),signal:AbortSignal.timeout(action==='chat_turn'?28000:16000)});
  const d=await (window.CaseyErrors?.json(r)||r.json());if(started!==generation||identity!==(auth()?.email||auth()?.access_token||''))throw Object.assign(new Error('Accesso cambiato'),{status:401});if(!r.ok){if(r.status===401&&!personal&&renew&&action!=='session'){sessionStorage.removeItem(sessionKey);return call(action,body,false);}throw Object.assign(new Error(d.error||'Operazione non riuscita'),{status:r.status});}return d;
 }
 window.addEventListener?.('storage',e=>{if(e.key===authKey)invalidateAuth();});
 function saveSession(t){sessionStorage.setItem(sessionKey,JSON.stringify({token:t,exp:Date.now()+86400000}));}
 window.HandoffAPI={call,auth,session,saveSession,authKey,sessionKey,mobile,refresh,invalidateAuth,get generation(){return generation;}};
})();
