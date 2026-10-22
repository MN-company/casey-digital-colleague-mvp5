/* Append-only reconciliation: conflicting edits are never silently overwritten. */
(function(root){
 function merge(base,local,remote){
  const equal=(a,b)=>JSON.stringify(a.map(t=>({role:t.role,text:t.text})))===JSON.stringify(b.map(t=>({role:t.role,text:t.text}))); 
  if(!equal(base,local.slice(0,base.length))||!equal(base,remote.slice(0,base.length)))throw new Error('La cronologia è cambiata. Conserva la bozza e riapri la conversazione.');
  const out=remote.map(t=>({...t})),ids=new Set(remote.map(t=>t.id).filter(Boolean));
  for(const turn of local.slice(base.length)){if(turn.id&&ids.has(turn.id))continue;out.push({...turn});if(turn.id)ids.add(turn.id);}
  return out;
 }
 root.CaseyChatMerge={merge};
})(typeof window==='undefined'?globalThis:window);
