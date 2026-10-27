import {BETA_LIVE_CONFIG} from '../_shared/beta-live-config.ts';
import {access,checked,cors,validateRequest,verifiedUser} from '../_shared/beta-access.ts';
const API_KEY=Deno.env.get('GEMINI_API_KEY')||'';
Deno.serve(async req=>{
 let reservedId:string|null=null;const token=req.headers.get('x-session-token')||'';
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json'}});
 try{
 validateRequest(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 const state=checked(await access(token,'state'));
 if(state.verified){const user=await verifiedUser(req);checked(await access(token,'link',null,{},user.id));}
 const raw=await req.text();if(raw.length>1000)return json({error:'Richiesta troppo lunga'},413);JSON.parse(raw);
 if(!API_KEY)return json({error:'Voce non disponibile. Puoi continuare a scrivere.'},503);
 const id=crypto.randomUUID();const lease=checked(await access(token,'voice',id));reservedId=id;
 const config=BETA_LIVE_CONFIG;
 const expires=new Date(lease.expires_at).getTime();
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':API_KEY},body:JSON.stringify({uses:1,newSessionExpireTime:new Date(Math.min(Date.now()+60000,expires)).toISOString(),expireTime:new Date(expires).toISOString(),bidiGenerateContentSetup:{model:'models/gemini-3.8-live',...config}}),signal:AbortSignal.timeout(10000)});
 const d=await r.json();if(!r.ok||!d.name){console.warn('Beta Live provisioning rejected',r.status,String(d.error?.status||'unknown')); await access(token,'voice_abort',id);reservedId=null;return json({error:'La voce non è disponibile in questo momento. Puoi continuare a scrivere.'},503);}
 reservedId=null;return json({token:d.name,model:'gemini-3.8-live',config,request_id:id,expires_at:lease.expires_at,seconds:lease.seconds});
 }catch(e){if(reservedId)await access(token,'voice_abort',reservedId).catch(()=>{});return json({error:(e as Error).message,code:(e as any).code},(e as any).status||500);}
});
