(() => {
 'use strict';
 const supported=['it-IT','en-US','es-ES'];
 let language=new URLSearchParams(location.search).get('lang');
 try{language=language||localStorage.getItem('casey-language');}catch{}
 if(!supported.includes(language))language='it-IT';
 function set(value){if(!supported.includes(value))return;language=value;document.documentElement.lang=value.split('-')[0];try{localStorage.setItem('casey-language',value);}catch{}document.querySelectorAll('[data-casey-language]').forEach(e=>e.value=value);window.dispatchEvent(new CustomEvent('casey:language',{detail:value}));const frame=document.getElementById('caseyFrame');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'casey-language',value},location.origin);}
 window.CaseyLanguage=Object.freeze({get:()=>language,set});
 document.querySelectorAll('[data-casey-language]').forEach(e=>e.addEventListener('change',()=>set(e.value)));
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='casey-language')set(e.data.value);});set(language);
})();
