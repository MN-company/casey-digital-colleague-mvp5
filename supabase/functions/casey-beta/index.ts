import {sendBetaAccessEmail,validEmail} from '../_shared/beta-mail.ts';
import {answer,lookupKnowledge} from '../_shared/definitivo-preview.ts';
import {classifyHandoff as classify} from '../_shared/handoff-policy.js';
import {BASE,KEY,SITE,access,checked,cors,validateRequest,rate,verifiedUser,requestId,hash,db} from '../_shared/beta-access.ts';
Deno.serve(async req=>{
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json'}});
 try{
 validateRequest(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 const raw=await req.text();if(raw.length>64000)return json({error:'Richiesta troppo lunga'},413);const b=JSON.parse(raw);
 if(b.action==='config')return json(await access('','config'));
 const token=req.headers.get('x-session-token')||'';
 if(b.action==='start'){
  await rate(req,'start',600,3600);const newToken=crypto.randomUUID()+crypto.randomUUID();const data=checked(await access(newToken,'create'));return json({...data,token:newToken});
 }
 if(!await db('rpc/hf7_take_rate',{p_bucket:'beta:requests:'+await hash(token),p_limit:120,p_window_seconds:60}))return json({error:'Attendi un minuto prima di continuare'},429);
 const state=checked(await access(token,'state'));
 if(b.action==='email'){
  const email=String(b.email||'').trim().toLowerCase();if(!validEmail(email))return json({error:'Inserisci una email valida'},400);
  await rate(req,'email',50,3600);
  if(!await db('rpc/hf7_take_rate',{p_bucket:'beta:email:'+await hash(email),p_limit:1,p_window_seconds:60}))return json({error:'Attendi un minuto prima di richiedere un altro link'},429);
  if(!await db('rpc/hf7_take_rate',{p_bucket:'beta:email-global',p_limit:100,p_window_seconds:86400}))return json({error:'Il limite di invio email di oggi è stato raggiunto. Puoi continuare come ospite.'},429);
  try{return json(await sendBetaAccessEmail(email));}catch{return json({error:'Accesso email temporaneamente non disponibile. Puoi continuare come ospite.'},503);}
 }
 // A verified-linked capability is insufficient on its own: require the matching Auth identity.
 let user:any=null;
 if(state.verified||['link','list','restore'].includes(b.action))user=await verifiedUser(req);
 if(state.verified)checked(await access(token,'link',null,{},user.id));
 if(b.action==='state')return json(state);
 if(b.action==='link')return json(checked(await access(token,'link',null,{},user.id)));
 if(b.action==='list')return json(checked(await access(token,'list',null,{},user.id)));
 if(b.action==='restore')return json(checked(await access(token,'restore',null,{conversation_id:requestId(b.conversation_id)},user.id)));
 if(b.action==='voice_save'){
 const context=Array.isArray(b.context)?b.context.slice(-100):[];
 if(context.some((t:any)=>!['user','assistant'].includes(t?.role)||typeof t.text!=='string'||t.text.length>6000))return json({error:'Conversazione non valida'},400);
 return json(checked(await access(token,'voice_save',requestId(b.request_id),{context:context.map((t:any)=>({role:t.role,text:t.text}))})));
 }
 if(b.action==='knowledge'){
  checked(await access(token,'voice_context',requestId(b.request_id)));
  if(!await db('rpc/hf7_take_rate',{p_bucket:'beta:knowledge:'+b.request_id,p_limit:30,p_window_seconds:3600}))return json({error:'Limite delle ricerche vocali raggiunto'},429);
  const query=String(b.query||'').trim();if(query.length<2||query.length>360)return json({error:'Domanda non valida'},400);
  return json(await lookupKnowledge(query,new Request(req.url),state.context,'it-IT'));
 }
 if(b.action==='turn'){
  const message=String(b.message||'').trim();if(!message||message.length>1000)return json({error:'Scrivi un messaggio di massimo 1.000 caratteri'},400);
  const id=requestId(b.request_id);const reservation=await access(token,'text',id,{message});
  if(reservation.error==='duplicate_request'&&reservation.result)return json(reservation.result);
  checked(reservation);
  let reply:any;
  try{
   const route=classify(message);
   reply=route.route==='public'?await answer([...reservation.context.slice(-10),{role:'user',text:message}],new Request(req.url),'it-IT'):{answer:'Per dati personali e appuntamenti apri il tuo account College. Verificare l’email di prova non abilita i servizi riservati agli studenti.',citations:[],mode:'account_required'};
  }catch{reply={answer:'Non riesco a consultare le fonti in questo momento. Riprova tra poco.',citations:[],mode:'unavailable'};}
  checked(await access(token,'finish',id,reply));return json(reply);
 }
 return json({error:'Operazione non disponibile'},400);
 }catch(e){return json({error:(e as Error).message,code:(e as any).code},(e as any).status||500);}
});
