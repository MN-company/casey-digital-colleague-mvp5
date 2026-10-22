/** Server-side gateway to the existing production authorization and booking protocol. */
export async function operation(b:any,u:any,s:string,req:Request,db:any,hash:any,base:string,key:string){
 if(!key)throw Object.assign(new Error('Configurazione operativa non disponibile'),{status:503});
 const fail=(message:string,status=400)=>Object.assign(new Error(message),{status});
 const allowed=['slots','profile','knowledge','prepare','commit','status','cancel'];
 if(!allowed.includes(b.operation))throw fail('Operazione non prevista');
 const owner={chat_id:'eq.'+b.chat_id,user_id:'eq.'+u.id};
 const query=(v:any)=>new URLSearchParams(v).toString();
 const sign=async(text:string)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');};
 const seed=await sign('casey-operation-session:'+b.chat_id+':'+u.id),raw=seed+seed.slice(0,8),digest=await hash(raw);
 let sessions=await db('dc_sessions?'+query({select:'id',token_hash:'eq.'+digest}));
 if(!sessions[0]){try{sessions=await db('dc_sessions',{token_hash:digest,expires_at:new Date(Date.now()+86400000).toISOString()});}catch{sessions=await db('dc_sessions?'+query({select:'id',token_hash:'eq.'+digest}));}}
 await db('dc_sessions?'+query({id:'eq.'+sessions[0].id}),{expires_at:new Date(Date.now()+86400000).toISOString()},'PATCH');
 const invoke=async(action:string,args:any={})=>{const r=await fetch(base+'/functions/v1/casey-original-ui',{method:'POST',headers:{'Content-Type':'application/json','x-session-token':raw,'x-student-token':req.headers.get('x-student-token')||''},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw fail(d.error||'Operazione non disponibile',r.status);return d;};
 const cipherKey=await crypto.subtle.importKey('raw',new Uint8Array((await sign('casey-operation-encryption-v1')).match(/../g)!.map(x=>parseInt(x,16))),{name:'AES-GCM'},false,['encrypt','decrypt']);
 const seal=async(text:string)=>{const iv=crypto.getRandomValues(new Uint8Array(12)),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(b.chat_id+':'+u.id)},cipherKey,new TextEncoder().encode(text)));return btoa(String.fromCharCode(...iv,...data));};
 const open=async(text:string)=>{const data=Uint8Array.from(atob(text),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12),additionalData:new TextEncoder().encode(b.chat_id+':'+u.id)},cipherKey,data.slice(12)));};
 const publicDraft=async(d:any)=>d?{id:d.id,request_id:d.request_id,slot:d.slot,email:d.email,expires_at:d.expires_at,status:d.status,result:d.result,confirmation_nonce:await sign('confirm:'+d.id+':'+u.id+':'+s+':'+d.expires_at)}:null;
 const drafts=()=>db('hf7_operation_drafts?'+query({...owner,...(b.operation==='status'&&b.request_id?{request_id:'eq.'+b.request_id}:{}),order:'created_at.desc',limit:'1'}));
 if(b.operation==='slots')return invoke('slots',{day:b.day,time:b.time,period:b.period});
 if(b.operation==='profile')return invoke('auth_profile');
 if(b.operation==='knowledge')return invoke('knowledge_lookup',{query:String(b.query||'').slice(0,3000)});
 // Serialize preparation, cancellation and commitment for a chat, including cross-device requests.
 const lease=crypto.randomUUID();
 if(!await db('rpc/hf7_operation_lock',{p_chat:b.chat_id,p_lease:lease}))throw fail('Un’operazione è già in corso. Attendi e controlla lo stato.',409);
 try{
 let d=(await drafts())[0];
 if(b.operation==='status'){
  if(d&&['committing','completed'].includes(d.status)){const result=await invoke('operation_status',{request_id:d.request_id});if(result.saved){await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:'completed',result},'PATCH');d={...d,status:'completed',result};}else if(Date.parse(d.expires_at)<=Date.now()){await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:'cancelled',result:{saved:false,expired:true}},'PATCH');d={...d,status:'cancelled',result:{saved:false,expired:true}};}}
  return {draft:await publicDraft(d)};
 }
 if(b.operation==='cancel'){
  if(d?.status==='committing')throw fail('Verifica prima l’esito della prenotazione in corso.',409);if(d?.status==='completed')throw fail('L’appuntamento è già registrato. Per modificarlo contatta lo Student Office.',409);
  await invoke('abort');if(d?.status==='prepared')await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:'cancelled'},'PATCH');return {cancelled:true};
 }
 if(b.operation==='prepare'){
  if(d?.status==='committing')throw fail('Verifica prima la prenotazione precedente.',409);
  if(d?.status==='prepared'&&Date.parse(d.expires_at)>Date.now()&&d.slot_id===b.slot_id)return {draft:await publicDraft(d)};
  if(d?.status==='prepared')await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:'cancelled'},'PATCH');
  const r=await invoke('prepare',{slot_id:b.slot_id});
  if(!r.request_id||!r.confirmation_token||!r.slot)throw fail('Il backend non ha preparato una conferma valida',502);
  const inserted=await db('hf7_operation_drafts',{chat_id:b.chat_id,user_id:u.id,request_id:r.request_id,slot_id:b.slot_id,confirmation_cipher:await seal(r.confirmation_token),slot:r.slot,email:r.email,expires_at:new Date(Date.now()+Math.min(r.expires_in||300,300)*1000).toISOString()});
  return {draft:await publicDraft(inserted[0])};
 }
 if(!d||d.id!==b.draft_id)throw fail('Conferma non disponibile',404);
 const expected=await sign('confirm:'+d.id+':'+u.id+':'+s+':'+d.expires_at);
 if(b.confirmed!==true||typeof b.confirmation_nonce!=='string'||await hash(b.confirmation_nonce)!==await hash(expected))throw fail('Usa il pulsante Confermo per autorizzare la prenotazione',403);
 if(d.status==='completed')return {draft:await publicDraft(d),...d.result};
 if(!['prepared','committing'].includes(d.status)||Date.parse(d.expires_at)<=Date.now())throw fail('La conferma è scaduta. Scegli nuovamente l’orario.',409);
 await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:'committing'},'PATCH');
 // Original backend rechecks roster, FreeBusy, confirmation expiry and idempotent request ID.
 const result=await invoke('commit',{request_id:d.request_id,slot_id:d.slot_id,confirmation_token:await open(d.confirmation_cipher)});
 await db('hf7_operation_drafts?'+query({id:'eq.'+d.id}),{status:result.saved?'completed':'committing',result},'PATCH');
 return {draft:await publicDraft({...d,status:result.saved?'completed':'committing',result}),...result};
 }finally{await db('hf7_operation_locks?'+query({chat_id:'eq.'+b.chat_id,lease:'eq.'+lease}),undefined,'DELETE').catch(()=>{});}
}
