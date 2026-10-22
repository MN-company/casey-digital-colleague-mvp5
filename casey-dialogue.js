/* Ephemeral context stays in this tab and is cleared at identity boundaries. */
(() => {
  const turns=[];
  function append(role,text){text=String(text||'').trim();if(!text)return;
    if(turns.at(-1)?.role===role&&turns.at(-1)?.text===text)return;
    turns.push({role,text:text.slice(0,1600)});while(turns.length>12)turns.shift();
    window.dispatchEvent(new CustomEvent('casey:dialogue'));
  }
  window.CaseyDialogue=Object.freeze({append,clear(){turns.length=0;},snapshot(){return turns.map(t=>({...t}));}});
})();
