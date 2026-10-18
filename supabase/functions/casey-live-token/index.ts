/** Issues a single-use constrained ephemeral Gemini Live token after Casey session verification. */
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const DB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || '';
const API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODEL = 'gemini-3.8-live';
const ORIGINS = new Set(['https://casey-digital-colleague-live.vercel.app', 'https://casey-digital-colleague-live-p7g86na4v-mnbrain.vercel.app', 'https://casey-digital-colleague-live-297jr3dfv-mnbrain.vercel.app', 'https://casey-digital-colleague-live-git-feature-casey-live-5-2-mnbrain.vercel.app', 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:4173', 'http://127.0.0.1:4173']);
const LANGUAGE: Record<string, string> = { 'it-IT': 'Italian', 'en-US': 'English', 'es-ES': 'Spanish' };
const encoder = new TextEncoder();
const cors = (origin: string) => ({ 'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://casey-digital-colleague-live.vercel.app', 'Access-Control-Allow-Headers': 'content-type,x-session-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
const json = (body: object, status: number, origin: string) => new Response(JSON.stringify(body), {status, headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}});
async function db(path:string, body?:object):Promise<any> {
 if(!SUPABASE_URL || !DB_KEY) throw new Error('Backend credentials unavailable');
 const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {method:body?'POST':'GET', headers:{apikey:DB_KEY,...(DB_KEY.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${DB_KEY}`}), 'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(7000)});
 if(!response.ok) throw new Error(`Database unavailable (${response.status})`);
 return response.json();
}
async function hash(s:string):Promise<string> { const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)));return [...digest].map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function authorize(req:Request) {
 const token=req.headers.get('x-session-token')||'';
 if(!/^[a-f\d-]{72}$/i.test(token)) return false;
 const q=new URLSearchParams({select:'id',token_hash:'eq.'+await hash(token),expires_at:'gt.'+new Date().toISOString(),limit:'1'});
 const sessions=await db('dc_sessions?'+q.toString());if(!sessions?.[0]?.id)return false;
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
 // Casey anti-abuse quotas are separate from Gemini API quotas. Buckets expire after 24h.
 for(const [type, bucket, limit] of [
  ['session', `casey-live:session:${sessions[0].id}`, 40],
  ['ip', `casey-live:ip:${await hash(ip)}`, 60],
  ['global', 'casey-live:global', 100]
 ] as [string,string,number][]) {
  const ok=await db('rpc/dc_take_rate',{p_bucket:bucket,p_limit:limit});
  if(ok!==true){
   console.warn('Casey Live safety limit reached:', type);
   throw Object.assign(new Error('Casey rate limit reached'),{status:429});
  }
 }
 return true;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 if(origin&&!ORIGINS.has(origin))return json({error:'Forbidden origin'},403,origin);
 try {
  if(!await authorize(req))return json({error:'Casey session required'},401,origin);
  if(!API_KEY)return json({error:'Gemini Live not configured'},503,origin);
  if(Number(req.headers.get('content-length')||0)>1024)return json({error:'Payload too large'},413,origin);
  const body=await req.json();const locale=body?.language;
  if(typeof locale!=='string'||!Object.hasOwn(LANGUAGE,locale))return json({error:'Unsupported language'},400,origin);
  const now=Date.now();
  const instructions=`You are Casey, a helpful concise H-FARM student assistant. RESPOND ONLY IN ${LANGUAGE[locale]}. Never mix languages, regardless of user's accent. Talk naturally, briefly and warmly. When a user is choosing a date, time or option, ask once and silently WAIT for their decision. Do not repeatedly prompt during silence. Never claim to have checked a calendar, accessed Gmail, made a booking, sent an email or verified university policies. You have NO tools in this live conversational prototype. For any real-world action, explain that the user must use the existing Casey booking interface to confirm it. Never invent student records, openings, or institutional facts.`;
  const config={generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Charon'}}}},inputAudioTranscription:{},outputAudioTranscription:{},realtimeInputConfig:{automaticActivityDetection:{disabled:false,prefixPaddingMs:40,silenceDurationMs:800}},systemInstruction:{parts:[{text:instructions}]}};
  // Limit use to one Live session and its approved model/config; API key never reaches browser.
  const google=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':API_KEY},body:JSON.stringify({uses:1,newSessionExpireTime:new Date(now+60000).toISOString(),expireTime:new Date(now+20*60000).toISOString(),bidiGenerateContentSetup:{model:'models/'+MODEL,...config}}),signal:AbortSignal.timeout(9000)});
  const result=await google.json().catch(()=>({}));
  if(!google.ok||typeof result.name!=='string') {const e=result?.error||{};console.error('Gemini token provisioning failed:',google.status,'code:',String(e.status||'unknown').slice(0,60),'message:',String(e.message||'unspecified').slice(0,350));return google.status===429 ? json({error:'Gemini API quota reached',source:'google'},429,origin) : json({error:'Gemini Live unavailable',source:'google'},502,origin);}
  return json({token:result.name,model:MODEL,config,expiresIn:60},200,origin);
 }catch(error){const status=typeof (error as any)?.status==='number'?(error as any).status:503;console.error('Casey Live token failure:',error instanceof Error?error.message:'Unknown');return json({error:status===429?'Casey demo safety limit reached':'Live session unavailable',source:status===429?'casey':'backend'},status,origin);}
});
