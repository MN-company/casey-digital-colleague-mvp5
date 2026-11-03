/* Free mode after the demo (index.html?libero=1): normal Casey (text/Live as usual) but no QR handoff.
   Personal requests get an in-place explanation of the privacy filter plus a non-interactive info card; no link is ever issued.
   Without ?libero=1 (or with ?demo=1) nothing changes. */
(()=>{'use strict';
const q=new URLSearchParams(location.search);if(q.get('libero')!=='1'||q.get('demo')==='1')return;
const MESSAGES={
 it:'Questa è una richiesta che riguarda te, quindi qui sul totem non la gestisco: non so chi sei e chiunque potrebbe sentire. Nella versione per gli studenti ti farei inquadrare un QR, accederesti con il tuo account e sceglieresti dal telefono. Intanto, se vuoi, ti rispondo su orari e procedure generali.',
 en:'This request is about you, so I don\'t handle it here at the kiosk: I don\'t know who you are and anyone could overhear. In the student version I would have you scan a QR code, sign in with your account and choose from your phone. Meanwhile, if you like, I can answer questions about opening hours and general procedures.'};
const MESSAGE=MESSAGES.it;
const CARD_TITLE='Come funziona per gli studenti';
const CARD_STEPS=['1 · Inquadri il QR','2 · Accedi con il tuo account College','3 · Scegli dal telefono','4 · Confermi tu: senza conferma non succede nulla'];
const CARD_MS=25000;
const lang=()=>/^en/i.test(window.CaseyLanguage?.get?.()||'')?'en':'it';
const $=id=>document.getElementById(id);
let cardTimer=0,cardOn=false;
// Reuses the #qrCard container as a static info card: QR image and "Apri" button hidden, no link.
function setCard(on){
 const card=$('qrCard'),code=$('qrCode'),title=$('qrTitle'),sub=$('qrSub'),meta=$('qrMeta'),open=card?.querySelector?.('.open');
 if(!card)return;clearTimeout(cardTimer);cardTimer=0;
 if(code)code.hidden=on;if(open)open.hidden=on;
 if(on){title.textContent=CARD_TITLE;sub.textContent=CARD_STEPS.join('\n');if(sub.style)sub.style.whiteSpace='pre-line';if(meta)meta.textContent='';card.classList.remove('expired');card.classList.add('on');card.setAttribute?.('aria-live','polite');cardOn=true;cardTimer=setTimeout(()=>setCard(false),CARD_MS);}
 else if(cardOn){card.classList.remove('on');title.textContent='';sub.textContent='';if(sub.style)sub.style.whiteSpace='';cardOn=false;}
}
// definitivo-kiosk.js routes its own QR paths (send, Live bridge) through window.handover.
async function noHandoff(){
 const l=lang(),text=MESSAGES[l];
 window.CaseyDialogue?.append?.('assistant',text);window.say?.(text);setCard(true);
 return {status:'handoff_disabled',note:'Free mode: no QR and no link. Say exactly this sentence in the user\'s language, then stop: "'+text+'" Do not propose any QR code or link and do not ask for any personal data (name, email, student ID).'};
}
window.handover=noHandoff;window.openSession=noHandoff;window.openPhone=()=>{};
for(const name of ['goIdle','resetAll','send']){const orig=window[name];if(typeof orig==='function')window[name]=function(...a){setCard(false);return orig.apply(this,a);};}
const hide=()=>{for(const n of document.querySelectorAll('#settingsLink,#appLink,#tryCaseyLink,#caseyPasswordForm,.presentation-tools a[href^="settings.html"]'))n.hidden=true;};
hide();document.addEventListener('DOMContentLoaded',hide);
window.CaseyFreeMode=Object.freeze({active:true,message:MESSAGE,messages:Object.freeze({...MESSAGES}),cardTitle:CARD_TITLE,cardSteps:Object.freeze([...CARD_STEPS]),cardVisible:()=>cardOn});
})();
