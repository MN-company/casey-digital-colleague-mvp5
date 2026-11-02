/* Free mode after the demo (index.html?libero=1): normal Casey (text/Live as usual) but no QR handoff.
   Personal requests get a polite in-place message; no link is ever issued. Without ?libero=1 (or with ?demo=1) nothing changes. */
(()=>{'use strict';
const q=new URLSearchParams(location.search);if(q.get('libero')!=='1'||q.get('demo')==='1')return;
const MESSAGE='Per le richieste personali usa l\'app College sul tuo telefono.';
// definitivo-kiosk.js routes its own QR paths (send, Live bridge) through window.handover.
async function noHandoff(){window.CaseyDialogue?.append?.('assistant',MESSAGE);window.say?.(MESSAGE);return {status:'handoff_disabled',note:'Free mode: no QR. Tell the user: '+MESSAGE};}
window.handover=noHandoff;window.openSession=noHandoff;window.openPhone=()=>{};
const hide=()=>{for(const n of document.querySelectorAll('#settingsLink,#appLink,#tryCaseyLink,#caseyPasswordForm,.presentation-tools a[href^="settings.html"]'))n.hidden=true;};
hide();document.addEventListener('DOMContentLoaded',hide);
window.CaseyFreeMode=Object.freeze({active:true,message:MESSAGE});
})();
