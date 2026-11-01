/* Persistent Student Office session for the demo branch (totem + presentation calendar window).
   settings.js and real-calendar.js keep reading the per-tab sessionStorage key 'casey-v3-admin'. This bridge mirrors
   that token into localStorage 'casey-demo-admin-v1' so a new tab or window on this origin (e.g. index.html?view=calendar
   opened with noopener) starts already signed in. The token is still an opaque server session: the server decides
   validity and expiry, and any 401 removes both copies. Explicit Logout removes both copies here and in other tabs.
   Loaded before settings.js / real-calendar.js. */
(()=>{'use strict';
const KEY='casey-v3-admin',COPY='casey-demo-admin-v1';
const get=(s,k)=>{try{return s.getItem(k);}catch{return null;}};
const put=(s,k,v)=>{try{s.setItem(k,v);}catch{}};
const del=(s,k)=>{try{s.removeItem(k);}catch{}};
// The shared copy wins: it is the most recent token saved by any tab (a later sign-in overwrites it).
function token(){const copy=get(localStorage,COPY);if(copy&&get(sessionStorage,KEY)!==copy)put(sessionStorage,KEY,copy);return get(sessionStorage,KEY);}
function save(value){if(!value)return;put(sessionStorage,KEY,value);put(localStorage,COPY,value);}
// clear() = explicit Logout: forget everywhere. clear(rejected) = server said 401 for that token: forget it only, so a
// stale tab cannot wipe a newer sign-in saved by another tab.
function clear(rejected){
 if(rejected===undefined||get(sessionStorage,KEY)===rejected)del(sessionStorage,KEY);
 if(rejected===undefined||get(localStorage,COPY)===rejected)del(localStorage,COPY);
}
token();
// Sign-in or logout in another tab: follow it here so the calendar window never keeps a dead token.
window.addEventListener('storage',e=>{if(e.key!==COPY)return;if(e.newValue)put(sessionStorage,KEY,e.newValue);else del(sessionStorage,KEY);window.dispatchEvent(new CustomEvent('casey:demo-admin'));});
window.CaseyDemoAdmin=Object.freeze({token,save,clear});
})();
