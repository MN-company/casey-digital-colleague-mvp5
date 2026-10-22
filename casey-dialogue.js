/* Logical chat history: never silently truncate messages during handoff. */
(() => {
 const turns=[];
 function append(role,text){text=String(text||'').trim();if(!text)return;if(turns.at(-1)?.role===role&&turns.at(-1)?.text===text)return;turns.push({role,text});window.dispatchEvent(new CustomEvent('casey:dialogue'));}
 window.CaseyDialogue=Object.freeze({append,clear(){turns.length=0;},snapshot(){return turns.map(t=>({...t}));}});
})();
