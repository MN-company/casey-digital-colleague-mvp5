/* Logical chat history: never silently truncate messages during handoff. */
(() => {
 const turns=[];let identified=false;
 function append(role,text){text=String(text||'').trim();if(!text)return;if(turns.at(-1)?.role===role&&turns.at(-1)?.text===text)return;turns.push({role,text,...(identified?{id:crypto.randomUUID()}:{})});window.dispatchEvent(new CustomEvent('casey:dialogue'));}
 window.CaseyDialogue=Object.freeze({append,replace(items){turns.length=0;identified=true;for(const [i,t] of items.entries())turns.push({role:t.role,text:t.text,id:t.id||('legacy-'+i)});},clear(){turns.length=0;},snapshot(){return turns.map(t=>({...t}));}});
})();
