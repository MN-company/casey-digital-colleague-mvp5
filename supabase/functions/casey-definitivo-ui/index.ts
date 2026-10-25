import {answer} from '../_shared/definitivo-preview.ts';
const BASE=Deno.env.get('SUPABASE_URL')||'';
if(!BASE.includes('sneaxpqnmlhnrhoautjx'))throw Error('Preview only');
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const origins=new Set(['http://localhost:8000','http://127.0.0.1:8000','http://localhost:4173','https://casey-digital-colleague-live-git-feature-casey-6-definitivo-mnbrain.vercel.app']);
const hash=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function db(path:string,body?:unknown){const r=await fetch(BASE+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Servizio non disponibile');return r.json();}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'content-type,apikey,authorization,x-session-token,x-student-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const json=(d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers});
 if(origin&&!origins.has(origin))return json({error:'Origine non autorizzata'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 try{
 const raw=await req.text();if(raw.length>15000)return json({error:'Richiesta troppo lunga'},413);const b=JSON.parse(raw);
 if(b.action==='public_config')return json({preview:true,knowledge:'candidate_corpus',calendar_enabled:false});
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0];
 if(!await db('rpc/hf7_take_rate',{p_bucket:'definitivo-ui:'+await hash(ip),p_limit:45,p_window_seconds:60}))return json({error:'Riprova tra un minuto'},429);
 if(b.action==='session'){const token=crypto.randomUUID()+crypto.randomUUID();await db('hf6_sessions',{token_hash:await hash(token),expires_at:new Date(Date.now()+86400000).toISOString()});return json({token});}
 const token=req.headers.get('x-session-token')||'';
 if(!/^[a-f0-9-]{72}$/i.test(token))return json({error:'Sessione richiesta'},401);
 const sessions=await db('hf6_sessions?'+new URLSearchParams({select:'id',token_hash:'eq.'+await hash(token),expires_at:'gt.'+new Date().toISOString()}));if(!sessions.length)return json({error:'Sessione scaduta'},401);
 if(b.action==='turn'){
 const message=String(b.message||'').trim();if(!message||message.length>1000)return json({error:'Messaggio non valido'},400);
 // Kiosk never forwards a student token. Scope remains SHARED.
 const publicReq=new Request(req.url);
 const history=(Array.isArray(b.history)?b.history:[]).filter((t:any)=>['user','assistant'].includes(t?.role)&&typeof t.text==='string').slice(-8);
 return json(await answer([...history,{role:'user',text:message}],publicReq,b.language));
 }
 return json({error:'Azione disabilitata in Preview'},403);
 }catch(e){return json({error:(e as Error).message||'Servizio non disponibile'},(e as any).status||500);}
});
