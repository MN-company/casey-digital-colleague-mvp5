export const BASE=Deno.env.get('SUPABASE_URL')||'';
export const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';
export const SITE='https://casey-digital-colleague-live.vercel.app';
export const allowedOrigins=new Set([SITE,'http://localhost:4173','http://localhost:8000']);
export async function hash(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function db(path:string,body?:unknown){
 const r=await fetch(BASE+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Object.assign(Error('Servizio temporaneamente non disponibile'),{status:503});return r.json();
}
export async function access(token:string,action:string,request:string|null=null,payload:unknown={},user:string|null=null){
 if(action!=='config'&&!/^[a-f0-9-]{72}$/i.test(token))throw Object.assign(Error('Apri una sessione per provare Casey'),{status:401});
 return db('rpc/casey_beta_access',{p_hash:await hash(token),p_action:action,p_request:request,p_payload:payload,p_user:user});
}
export async function verifiedUser(req:Request){
 const token=req.headers.get('x-student-token')||'';if(!token||token.length>4096)throw Object.assign(Error('Verifica la tua email per continuare'),{status:401});
 const r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});const u=await r.json();
 if(!r.ok||!u.id||!u.email_confirmed_at||u.is_anonymous)throw Object.assign(Error('Email non verificata o accesso scaduto'),{status:401});return u;
}
export const errors:Record<string,string>={login_not_initiated:'Richiedi un nuovo codice di accesso su questo dispositivo',unauthorized:'Sessione non valida',paused:'Le prove sono temporaneamente sospese',admissions_full:'Abbiamo raggiunto il limite di prove di oggi. Torna domani.',busy:'Attendi la risposta o termina la sessione vocale prima di continuare.',capacity:'Casey è occupato. Riprova tra poco; se la voce è piena puoi continuare a scrivere.',text_limit:'Hai raggiunto il limite di domande di oggi, oppure il tetto complessivo delle prove. Torna domani.',voice_limit:'Il tempo di voce disponibile oggi è terminato. Puoi continuare a scrivere.',voice_expired:'La sessione vocale è terminata. Puoi continuare a scrivere.',duplicate_request:'La richiesta è già in elaborazione',request_expired:'La richiesta è scaduta. Riprova.'};
export function checked(data:any){if(data.error)throw Object.assign(Error(errors[data.error]||'Operazione non disponibile'),{status:data.error==='unauthorized'?401:data.error==='login_not_initiated'?403:429,code:data.error});return data;}
export function cors(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:SITE,'Access-Control-Allow-Headers':'content-type,x-session-token,x-student-token','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};}
export function validateRequest(req:Request){const origin=req.headers.get('origin');if(origin&&!allowedOrigins.has(origin))throw Object.assign(Error('Origine non autorizzata'),{status:403});if(req.method!=='POST'&&req.method!=='OPTIONS')throw Object.assign(Error('Metodo non consentito'),{status:405});}
export async function rate(req:Request,label:string,limit:number,seconds=60){const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();if(!await db('rpc/hf7_take_rate',{p_bucket:'beta:'+label+':'+await hash(ip),p_limit:limit,p_window_seconds:seconds}))throw Object.assign(Error('Troppe richieste. Riprova tra poco.'),{status:429});}
export function requestId(value:unknown){if(typeof value!=='string'||!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value))throw Object.assign(Error('Richiesta non valida'),{status:400});return value;}
