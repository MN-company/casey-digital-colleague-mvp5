/* Live and text generation drive the same existing A-F avatar videos. */
(() => {
 'use strict';
 const states={A:'idle',B:'idle',C:'talk',D:'point',E:'think',F:'hand',LISTEN:'idle'};
 window.setAvatarState=key=>{const state=states[key]||'idle';window.setState(state,state==='talk'?'Risponde':state==='think'?'Un momento…':'Pronto',state==='talk'||state==='think'?'think':'');};
 window.addEventListener('casey:live-state',event=>{
  const state=event.detail?.state;
  if(state==='responding')window.setAvatarState('C');
  else if(state==='connecting')window.setAvatarState('E');
  else if(['idle','listening','text_ready','paused'].includes(state))window.setAvatarState('A');
 });
})();
