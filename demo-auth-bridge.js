/* Persistent demo login (app-blu.html?demo=1 only). Loaded in <head> before handoff-client.js and beta-client.js.
   The presenter signs in once with ?setup=1; a QR opened later in a new tab (fresh sessionStorage) adopts the saved
   session from localStorage. Outside demo mode this file does nothing: localStorage is never read or written.
   Trade-off: mirroring token changes back into the copy is required, because Supabase rotates refresh tokens and
   reusing an already-rotated one can revoke the whole session; a frozen copy would break every later QR tab. The
   price is that any demo tab can write the copy, so writes are narrowed: the first save only from a ?setup=1 tab or
   from a QR tab (#handoff=, read here in <head> before app-auth-shell strips it) that loaded signed out and then signed in,
   later updates only for the same user_id as the saved copy (a different identity never overwrites it and is never
   adopted), and a logout removes the copy only when this tab held the saved token. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('demo')!=='1'||!location.pathname.endsWith('/app-blu.html'))return;
const AUTH='casey-beta-auth-v1',COPY='casey-demo-auth-v1',setup=new URLSearchParams(location.search).get('setup')==='1';
const get=(s,k)=>{try{return s.getItem(k);}catch{return null;}};
// QR tab: #handoff= still in the URL (this runs before app-auth-shell strips it) or a pending claim after a reload.
const qr=/^[a-f0-9]{64}$/.test(new URLSearchParams(location.hash.slice(1)).get('handoff')||'')||!!get(sessionStorage,'casey-handoff-v2-pending');
const parse=v=>{try{return JSON.parse(v||'null');}catch{return null;}};
const sameUser=(a,b)=>!!a?.user_id&&a.user_id===b?.user_id;
const emit=()=>window.dispatchEvent?.(new CustomEvent('casey:demo-auth'));
// Seed: a tab without auth adopts the copy; a tab with an older token of the same user adopts the newer copy.
let last=get(localStorage,COPY);
let loggedInHere=false;
{const own=get(sessionStorage,AUTH),copy=parse(last);if(copy&&(!own||(sameUser(parse(own),copy)&&copy.expires_at>(parse(own)?.expires_at||0))))try{sessionStorage.setItem(AUTH,last);}catch{}
 const start=get(sessionStorage,AUTH);loggedInHere=qr&&!start;}
// Mirror only changes made in this tab. A cleared session removes the copy only if it was this tab's token, so a stale
// tab logging out (or failing an old refresh) or another identity's logout never deletes the saved session.
function writable(next){const copy=parse(get(localStorage,COPY));return copy?sameUser(copy,next):(setup||loggedInHere);}
function sync(){
 const now=get(sessionStorage,AUTH);if(now===last)return;const previous=last;last=now;
 try{if(now){if(writable(parse(now)))localStorage.setItem(COPY,now);}else if(get(localStorage,COPY)===previous)localStorage.removeItem(COPY);}catch{}
 emit();
}
// Explicit exit: forget the saved session on this device (the sign-out itself is done by the caller).
function clear(){last=null;try{localStorage.removeItem(COPY);}catch{}emit();}
// Another tab rotated the token: adopt it for the same user, so this tab never reuses a revoked refresh token.
window.addEventListener('storage',e=>{if(e.key!==COPY||!e.newValue)return;const own=parse(get(sessionStorage,AUTH)),next=parse(e.newValue);if(!own||!sameUser(own,next))return;try{sessionStorage.setItem(AUTH,e.newValue);}catch{}last=e.newValue;emit();});
for(const n of ['casey:account-change','casey:profile','pageshow','pagehide'])window.addEventListener(n,sync);
document.addEventListener('visibilitychange',sync);
// Rotation inside handoff-client/beta-client emits no event: a local 1 s check (no network) catches it.
if(typeof setInterval==='function')setInterval(sync,1000);
sync();
// Expired copy: Supabase access tokens last ~1 h, so a QR tab opened later would look signed out. `ready` refreshes it
// once (via CaseyBeta.refresh after DOMContentLoaded, else the same request beta-client makes), mirrors the rotated token
// through sync() (same-user rules) and resolves within 8 s regardless. A rejected refresh token clears the copy; a
// network error keeps it (the session may still be valid). Callers await it before deciding to show sign-in.
async function renew(){
 const a=parse(get(sessionStorage,AUTH));if(!a?.refresh_token||!(a.expires_at<=Date.now()+60000))return;
 try{
  if(window.CaseyBeta?.refresh)await window.CaseyBeta.refresh();
  else{const C=window.CASEY_CONFIG||{};const r=await fetch(C.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:C.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.access_token||!d.refresh_token){sessionStorage.removeItem(AUTH);window.dispatchEvent?.(new CustomEvent('casey:account-change',{detail:{signedOut:true}}));}
   else sessionStorage.setItem(AUTH,JSON.stringify({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+d.expires_in*1000,email:d.user?.email||'',user_id:d.user?.id||''}));}
 }catch{}
 if(!get(sessionStorage,AUTH)){clear();return;}
 sync();
}
const loaded=()=>new Promise(r=>{if(document.readyState!=='loading')return r();document.addEventListener('DOMContentLoaded',()=>r(),{once:true});});
let timer;const ready=Promise.race([loaded().then(renew).catch(()=>{}),new Promise(r=>{if(typeof setTimeout==='function')timer=setTimeout(r,8000);})]).then(()=>{if(timer)clearTimeout(timer);emit();});
window.CaseyDemoAuth=Object.freeze({sync,clear,ready,saved:()=>!!get(localStorage,COPY)});
})();
