import {operation as productionOperation} from './handoff-operations.ts';
import {routeRequest,generateReply,readCache,writeCache} from './casey-runtime.ts';
const BASE=Deno.env.get('SUPABASE_URL')||'';
if(!['https://sneaxpqnmlhnrhoautjx.supabase.co','https://oxzraaadxqsruibinlxn.supabase.co'].includes(BASE))throw Error('Unexpected Casey project');
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
async function profile(req:Request){
 const token=req.headers.get('x-student-token');if(!token)return {institution:'SHARED',program:null};
 const r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(7000)});
 const user=await r.json();if(!r.ok||!user.email_confirmed_at)throw Object.assign(Error('Accedi di nuovo'),{status:401});
 const p=await fetch(BASE+'/rest/v1/dc_v4_student_roster?'+new URLSearchParams({select:'institution,program',institutional_email:'eq.'+user.email,active:'eq.true',limit:'1'}),{headers,signal:AbortSignal.timeout(7000)});
 if(!p.ok)throw Error('Profilo non disponibile');const rows=await p.json();return rows[0]||{institution:'SHARED',program:null};
}
// Search the existing hf8 index; readable cards annotate the same source rows.
const stopwords=new Set('a al alla alle agli ai all anche che chi ci cio come con cosa da dal dalla dalle dei del della delle di dove e è ed gli ha ho i il in informazioni io la le lo mi nel nella nei nelle o per posso potrei puoi qual quale quali quando quanto riguardo sapere se si sono su sul sulla sulle un una uno vorrei voglio the a an and are can could do does for how i in is it of on please tell me my to what when where which with you about'.split(' '));
export function libraryKeywords(query:string){
 const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])].filter(t=>t.length>2&&!stopwords.has(t)).slice(0,8);
 const related:Record<string,string>={cane:'animali',cani:'animali',gatto:'animali',gatti:'animali',dog:'animali',dogs:'animali',pet:'animali',pets:'animali',withdraw:'ritiro',withdrawal:'ritiro',manutenzione:'malfunzionamenti',tesi:'laurea'};
 return [...new Set(terms.flatMap(t=>related[t]?[t,related[t]]:[t]))];
}
export async function retrieve(query:string,req:Request){
 const p=await profile(req);
 const institution=['CAFOSCARI','CICC'].includes(p.institution)?p.institution:'SHARED';
 const q=String(query||'').trim().slice(0,350);if(q.length<3)return null;
 const search=async(embedding:string|null,searchQuery=q)=>{
 const response=await fetch(BASE+'/rest/v1/rpc/hf8_search_hybrid',{method:'POST',headers,body:JSON.stringify({p_query:searchQuery,p_embedding:embedding,p_pool:institution,p_program:p.program||null,p_academic_year:null,p_limit:5,p_allow_candidate:false}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Object.assign(Error('Ricerca documentale non disponibile'),{status:503});return response.json();};
 // Keep lexical search available when the embedding provider is unavailable.
 let results=await search(null),mode='lexical_fallback';
 const terms=libraryKeywords(q);
 if(!results.length&&terms.length){results=await search(null,terms.join(' OR '));
 const score=(d:any)=>terms.reduce((n:number,t:string)=>n+((d.title+' '+d.section_hint).toLowerCase().includes(t)?4:0)+(d.excerpt.toLowerCase().includes(t)?1:0),0);
 results.sort((a:any,b:any)=>score(b)-score(a));}
 // Defense in depth: smoke fixtures and candidate documents never become policy answers.
 const docs=(Array.isArray(results)?results:[]).filter((d:any)=>d.approval_status==='approved'&&(institution!=='SHARED'||(d.scope_verified&&['CAFOSCARI','CICC'].every(p=>(d.explicit_applicability||[]).includes(p))))&&typeof d.excerpt==='string'&&d.document_sha256&&!(d.validity_flags||[]).includes('superseded'));
 if(!docs.length)return null;
 if(/^hc_[0-9a-f]{24}$/.test(docs[0].chunk_id)){
 const expanded=await fetch(BASE+'/rest/v1/rpc/hf8_library_expand',{method:'POST',headers,body:JSON.stringify({p_ids:docs.slice(0,2).map((d:any)=>d.chunk_id),p_pool:institution,p_program:p.program||null}),signal:AbortSignal.timeout(7000)});
 if(expanded.ok){const more=await expanded.json();for(const x of Array.isArray(more)?more:[])if(x.approval_status==='approved'&&!docs.some((d:any)=>d.chunk_id===x.chunk_id))docs.push(x);}
 }
 const d=docs[0];let card:any=null;
 if(/^hc_[0-9a-f]{24}$/.test(d.chunk_id)){
 const r=await fetch(BASE+'/rest/v1/casey_biblioteca_schede?'+new URLSearchParams({select:'id,sezione,tipo,testo_originale,requisiti_estratti,azioni_estratte,contatti,date_citate',id:'eq.'+d.chunk_id,limit:'1'}),{headers,signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Object.assign(Error('Biblioteca non disponibile'),{status:503});
 card=(await r.json())[0]||null;
 }
 const demo=(d.validity_flags||[]).includes('demo_approved_not_institutionally_reviewed');
 const source=d.title+(d.pdf_page?' · pagina '+d.pdf_page:'')+(d.academic_year?' · '+d.academic_year:'');
 return {evidence:docs,scope:institution,program:p.program||null,testo:card?.testo_originale||d.excerpt,scheda:card,etichetta:(demo?'Fonte approvata per la demo: ':'Fonte verificata: ')+source,confermata:true,demo_approved:demo,avvertenza:(d.validity_flags||[]).includes('historical_academic_year')?'Il documento si riferisce all’anno indicato: le scadenze attuali vanno confermate con Student Office.':null,retrieval:mode,fonti:docs.map((x:any)=>({id:x.chunk_id,titolo:x.title,pagina:x.pdf_page,url:x.source_url,sha256:x.document_sha256}))};
}
export async function answer(turns:any[],req:Request,language='it-IT'){
 const query=String(turns.filter(x=>x.role==='user').at(-1)?.text||'').slice(0,1000);
 const route=await routeRequest(query,turns);
 if(route==='operazioni')return {answer:language==='en-US'?'Use the appointment button to check real availability. ':language==='es-ES'?'Usa el botón de citas para comprobar la disponibilidad. ':'Usa il pulsante Appuntamento per verificare gli orari reali. ',citations:[],pool:route,mode:'operation_guidance'};
 if(route==='conversazione'){
 const key=JSON.stringify([query.toLowerCase(),language,turns.slice(-3)]);const cached=await readCache(route,key,BASE,headers);if(cached)return cached;
 const result=await generateReply(turns,language,[],'conversazione');
 const reply={answer:result.answer,citations:[],pool:route,mode:result.mode,generation_model:result.model};
 if(result.mode==='llm')writeCache(route,key,reply,[]);return reply;
 }
 const p=await profile(req);const scope=['CAFOSCARI','CICC'].includes(p.institution)?p.institution:'SHARED';
 // Scope + language + recent dialogue keep caches from crossing identities or unresolved follow-ups.
 const cacheKey=JSON.stringify([query.toLowerCase(),scope,p.program,language,turns.slice(-3)]);
 const cached=await readCache(route,cacheKey,BASE,headers);if(cached)return cached;
 const followup=/^(e (?:in|per|se)|and (?:in|if)|invece (?:in|per)|quindi)\b/i.test(query.trim());
 const previousUsers=turns.filter(t=>t.role==='user').slice(0,-1);
 if(followup&&!previousUsers.length)return {answer:'A quale situazione ti riferisci?',citations:[],pool:route,mode:'clarification'};
 const searchQuery=followup?String(previousUsers.at(-1)?.text||'')+' '+query:query;
 const doc=await retrieve(searchQuery,req);
 if(!doc)return {answer:language==='en-US'?'I could not find a reliable source for this. Which rule or service do you mean?':language==='es-ES'?'No encuentro una fuente fiable. ¿A qué norma o servicio te refieres?':'Non trovo una fonte affidabile per questa domanda. A quale regola o servizio ti riferisci?',citations:[],pool:route,mode:'no_source'};
 const result=await generateReply(turns,language,doc.evidence,route);
 const selected=doc.evidence.filter((d:any)=>result.source_ids.includes(d.chunk_id));
 const citations=selected.map((d:any)=>({id:d.chunk_id,title:d.title,page:d.pdf_page,url:d.source_url,sha256:d.document_sha256,demo_approved:(d.validity_flags||[]).includes('demo_approved_not_institutionally_reviewed')}));
 const reply={answer:result.answer,citations,pool:route,mode:result.mode,generation_model:result.model,retrieval:doc.retrieval,source_status:citations.length?'demo_approved':'no_source'};
 if(result.mode==='llm'&&citations.length)writeCache(route,cacheKey,reply,selected);return reply;
}
export async function operation(b:any,u:any,s:string,req:Request,db?:any,hash?:any,base=BASE,key=KEY){
 if(BASE.includes('oxzraaadxqsruibinlxn')&&b.operation!=='knowledge')return productionOperation(b,u,s,req,db,hash,base,key);
 if(b.operation==='status')return {draft:null,preview:true};
 if(b.operation==='slots')return {slots:[],calendar_connected:false,preview:true};
 if(b.operation==='profile')return {profile:await profile(req)};
 if(b.operation==='knowledge'){const d=await answer([{role:'user',text:String(b.query||'').slice(0,1000)}],req,b.language||'it-IT');return {verified:!!d.citations.length,matches:d.citations.map((x:any)=>({title:x.title,excerpt:d.answer,page:x.page}))};}
 throw Object.assign(Error('Operazioni esterne disabilitate in Preview. Nessun appuntamento o invio è stato eseguito.'),{status:403});
}
