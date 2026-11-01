/* Persistent demo login (app-blu.html?demo=1 only). Loaded in <head> before handoff-client.js and beta-client.js.
   The presenter signs in once with ?setup=1; a QR opened later in a new tab (fresh sessionStorage) adopts the saved
   session from localStorage. Outside demo mode this file does nothing: localStorage is never read or written.
   Trade-off: mirroring token changes back into the copy is required, because Supabase rotates refresh tokens and
   reusing an already-rotated one can revoke the whole session; a frozen copy would break every later QR tab. The
   price is that any demo tab can write the copy, so writes are narrowed: the first save only from a ?setup=1 tab,
   later updates only for the same user_id as the saved copy (a different identity never overwrites it and is never
   adopted), and a logout removes the copy only when this tab held the saved token. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('demo')!=='1'||!location.pathname.endsWith('/app-blu.html'))return;
const AUTH='casey-beta-auth-v1',COPY='casey-demo-auth-v1',setup=new URLSearchParams(location.search).get('setup')==='1';
const get=(s,k)=>{try{return s.getItem(k);}catch{return null;}};
const parse=v=>{try{return JSON.parse(v||'null');}catch{return null;}};
const sameUser=(a,b)=>!!a?.user_id&&a.user_id===b?.user_id;
const emit=()=>window.dispatchEvent?.(new CustomEvent('casey:demo-auth'));
// Seed: a tab without auth adopts the copy; a tab with an older token of the same user adopts the newer copy.
let last=get(localStorage,COPY);
{const own=get(sessionStorage,AUTH),copy=parse(last);if(copy&&(!own||(sameUser(parse(own),copy)&&copy.expires_at>(parse(own)?.expires_at||0))))try{sessionStorage.setItem(AUTH,last);}catch{}}
// Mirror only changes made in this tab. A cleared session removes the copy only if it was this tab's token, so a stale
// tab logging out (or failing an old refresh) or another identity's logout never deletes the saved session.
function writable(next){const copy=parse(get(localStorage,COPY));return copy?sameUser(copy,next):setup;}
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
window.CaseyDemoAuth=Object.freeze({sync,clear,saved:()=>!!get(localStorage,COPY)});
})();
