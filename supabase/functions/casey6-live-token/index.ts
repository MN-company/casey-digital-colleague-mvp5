/** Issues a single-use constrained ephemeral Gemini Live token after Casey session verification. */
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const DB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || '';
const API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODEL = 'gemini-3.8-live';
const ORIGINS = new Set(['https://casey-digital-colleague-live-hyjvjv7mf-mnbrain.vercel.app','https://casey-digital-colleague-live-r04f5708j-mnbrain.vercel.app','https://casey-digital-colleague-live-git-feature-casey-6-393aa8-mnbrain.vercel.app','http://localhost:8000','http://127.0.0.1:8000','http://localhost:4173','http://127.0.0.1:4173']);
const LANGUAGE: Record<string, string> = { 'it-IT': 'Italian', 'en-US': 'English', 'es-ES': 'Spanish' };
// Intent descriptions are not authorization. The server and College app enforce all permissions.
const LIVE_TOOLS = [{ functionDeclarations: [
 {name:'find_available_slots',description:'Read real unbooked Student Office appointments from Google Calendar. Use for requests to book. Ask for a date if ambiguous. Never invent availability. Read local_start/local_end exactly as Europe/Rome local time; start/end ISO values may be UTC and must never be read as local hours.',parameters:{type:'OBJECT',properties:{day:{type:'STRING',description:'Optional YYYY-MM-DD date in Europe/Rome timezone'},time:{type:'STRING',description:'Optional HH:MM 24-hour local time'},period:{type:'STRING',enum:['morning','afternoon']} }}},
 {name:'prepare_booking',description:'After the student chooses an exact slot ID returned by find_available_slots, prepare a booking and show on-screen confirmation buttons. The booking is NOT committed by this tool; wait for the student to click Confermo. If unauthenticated direct student to the signed-in College app.',parameters:{type:'OBJECT',properties:{slot_id:{type:'STRING',description:'UUID of one verified available appointment slot'}},required:['slot_id']}},
 {name:'get_booking_status',description:'Verify booking sync status for an existing request ID. Never claim Google Calendar confirmed unless google_sync equals created.',parameters:{type:'OBJECT',properties:{request_id:{type:'STRING',description:'UUID of a booking request'}},required:['request_id']}},
 {name:'search_verified_knowledge',description:'Find an official verified document excerpt. Use to answer university policies, exam dates, academic rules or public campus procedures. If verified is false, explicitly say the source is unavailable.',parameters:{type:'OBJECT',properties:{query:{type:'STRING',description:'Specific student question in Italian, English or Spanish'}},required:['query']}}
]}];
const boundedLimit = (name:string, fallback:number) => {
 const v=Number(Deno.env.get(name)||fallback);
 return Number.isInteger(v)&&v>=40&&v<=20000?v:fallback;
};
const LIVE_SESSION_LIMIT = boundedLimit('CASEY_LIVE_SESSION_LIMIT', 240);
const LIVE_IP_LIMIT = boundedLimit('CASEY_LIVE_IP_LIMIT', 900);
const LIVE_GLOBAL_LIMIT = boundedLimit('CASEY_LIVE_GLOBAL_LIMIT', 2500);

const allowOrigin = (origin:string) => ORIGINS.has(origin);
const encoder = new TextEncoder();
const cors = (origin: string) => ({ 'Access-Control-Allow-Origin': allowOrigin(origin) ? origin : 'https://casey-digital-colleague-live.vercel.app', 'Access-Control-Allow-Headers': 'content-type,x-session-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
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
 for(const [bucket, limit] of [[`casey6-preview-live:session:${sessions[0].id}`,LIVE_SESSION_LIMIT],[`casey6-preview-live:ip:${await hash(ip)}`,LIVE_IP_LIMIT],['casey6-preview-live:global',LIVE_GLOBAL_LIMIT]] as [string,number][]) {
  const ok=await db('rpc/dc_take_rate',{p_bucket:bucket,p_limit:limit});
  if(ok!==true)throw Object.assign(new Error('Casey demo safety limit'),{status:429});
 }
 return true;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=='POST')return json({error:'Method not allowed'},405,origin);
 if(origin&&!allowOrigin(origin))return json({error:'Forbidden origin'},403,origin);
 try {
  if(!await authorize(req))return json({error:'Casey session required'},401,origin);
  if(!API_KEY)return json({error:'Gemini Live not configured'},503,origin);
  if(Number(req.headers.get('content-length')||0)>1024)return json({error:'Payload too large'},413,origin);
  const body=await req.json();const locale=body?.language;
  if(typeof locale!=='string'||!Object.hasOwn(LANGUAGE,locale))return json({error:'Unsupported language'},400,origin);
  const now=Date.now();
  const instructions=`You are Casey, H-FARM College's student assistant. RESPOND ONLY IN ${LANGUAGE[locale]}. Speak naturally and concisely. For booking and verified campus questions USE the supplied tools instead of guessing. NEVER claim a booking has been confirmed from prepare_booking; a visible UI button and verified Google Calendar result are mandatory. If a tool replies authentication_required, tell the student to continue in the authenticated College app; do not request passwords or personal identifiers through this public totem. For campus policy or exam dates rely only on verified excerpts returned by search_verified_knowledge, mention exact source titles, and never invent missing facts. Never send an email, access private Calendar events, claim to have made a booking, or expose tool-internal fields. When the user is choosing an option, ask once and WAIT for their answer. Timezone is Europe/Rome. The UI is a demo with Emma and Sofia scenarios, which MUST NOT be mistaken for actual user identity or policy facts. When the user clicks confirmation, a later Casey system result update will inform you of the true status.`;
  const config={generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Charon'}}}},inputAudioTranscription:{},outputAudioTranscription:{},realtimeInputConfig:{automaticActivityDetection:{disabled:false,prefixPaddingMs:40,silenceDurationMs:800}},systemInstruction:{parts:[{text:instructions}]},tools:LIVE_TOOLS};
  // Limit use to one Live session and its approved model/config; API key never reaches browser.
  const google=await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':API_KEY},body:JSON.stringify({uses:1,newSessionExpireTime:new Date(now+60000).toISOString(),expireTime:new Date(now+20*60000).toISOString(),bidiGenerateContentSetup:{model:'models/'+MODEL,...config}}),signal:AbortSignal.timeout(9000)});
  const result=await google.json().catch(()=>({}));
  if(!google.ok||typeof result.name!=='string') {const e=result?.error||{};console.error('Gemini token provisioning failed:',google.status,'code:',String(e.status||'unknown').slice(0,60),'message:',String(e.message||'unspecified').slice(0,350));return google.status===429?json({error:'Google Gemini API rate limit',source:'google'},429,origin):json({error:'Gemini Live unavailable',source:'google'},502,origin);}
  return json({token:result.name,model:MODEL,config,expiresIn:60},200,origin);
 }catch(error){const status=typeof (error as any)?.status==='number'?(error as any).status:503;console.error('Casey Live token failure:',error instanceof Error?error.message:'Unknown');return json({error:status===429?'Casey demo safety limit reached (not a Google quota)':'Live session unavailable',source:status===429?'casey':'backend'},status,origin);}
});
