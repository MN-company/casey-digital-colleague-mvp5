/* Shared API adapter; credentials stay in this tab, and only the phone has Auth. */
(() => {
 'use strict';
 const C=window.CASEY_CONFIG;
 const mobile=new URLSearchParams(location.search).get('mobile')==='1';
 const sessionKey=mobile||location.pathname.endsWith('/college.html')?'casey-handoff-v2-phone-session':'casey-handoff-v2-kiosk-session';
 const authKey='casey-handoff-v2-phone-auth';
 function auth(){try{const a=JSON.parse(sessionStorage.getItem(authKey)||'null');return a?.expires_at>Date.now()+30000?a:null;}catch{return null;}}
 function session(){try{return JSON.parse(sessionStorage.getItem(sessionKey)||'null')?.token||'';}catch{return '';}}
 async function call(action,body={}){
  const r=await fetch(C.handoffUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':session(),'x-student-token':auth()?.access_token||''},body:JSON.stringify({action,chat_id:sessionStorage.getItem('casey-handoff-v2-chat-id'),...body}),signal:AbortSignal.timeout(action==='chat_turn'?45000:16000)});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Operazione non riuscita');return d;
 }
 function saveSession(t){sessionStorage.setItem(sessionKey,JSON.stringify({token:t,exp:Date.now()+86400000}));}
 window.HandoffAPI={call,auth,session,saveSession,authKey,sessionKey,mobile};
})();
