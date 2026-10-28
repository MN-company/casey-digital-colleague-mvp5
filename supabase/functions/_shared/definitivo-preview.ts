import {operation as productionOperation} from './handoff-operations.ts';
import {routeRequest,generateReply,readCache,writeCache} from './casey-runtime.ts';
import {queryVector} from './embeddings.ts';
import {knowledgeScope,needsCourse,namedCourse,courseLevel} from './knowledge-scope.ts';
const BASE=Deno.env.get('SUPABASE_URL')||'';
if(!['https://sneaxpqnmlhnrhoautjx.supabase.co','https://oxzraaadxqsruibinlxn.supabase.co'].includes(BASE))throw Error('Unexpected Casey project');
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const headers={apikey:KEY,...(KEY.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+KEY}),'Content-Type':'application/json'};
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
 const related:Record<string,string>={cane:'animali',cani:'animali',gatto:'animali',gatti:'animali',dog:'animali',dogs:'animali',pet:'animali',pets:'animali',stampare:'printer',stampa:'printer',esame:'exam',esami:'exams',superare:'pass',voto:'mark',minimo:'minimum',withdraw:'ritiro',withdrawal:'ritiro',manutenzione:'malfunzionamenti',tesi:'laurea'};
 return [...new Set(terms.flatMap(t=>related[t]?[t,related[t]]:[t]))];
}
export async function retrieve(query:string,req:Request,resolvedScope?:any){
 const p=resolvedScope||knowledgeScope(await profile(req),[{role:'user',text:query}]);
 const institution=['CAFOSCARI','CICC'].includes(p.institution)?p.institution:'SHARED';
 const q=String(query||'').trim().slice(0,350);if(q.length<3)return null;
 const grading=/vot[oi]|superar|pass|resit|marks?|grades?/i.test(q);
 const search=async(embedding:number[]|null,searchQuery=q)=>{
 const response=await fetch(BASE+'/rest/v1/rpc/hf8_search_hybrid',{method:'POST',headers,body:JSON.stringify({p_query:searchQuery,p_embedding:embedding,p_pool:institution,p_program:p.program||null,p_academic_year:null,p_limit:8,p_allow_candidate:false}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Object.assign(Error('Ricerca documentale non disponibile'),{status:503});return response.json();};
 // Both query and corpus use the same normalized 768-dimensional embedding space.
 const vector=await queryVector(q);
 let results=await search(vector),mode=vector?'hybrid':'lexical_fallback';
 const terms=libraryKeywords(q);
 if((!results.length||!results.some((x:any)=>x.lexical_rank))&&terms.length){
 const courseWords=new Set(String(p.label||'').toLowerCase().match(/[a-z]+/g)||[]);
 const specific=terms.filter(t=>!courseWords.has(t)&&!['corso','programma','nel','previsto'].includes(t));
 results=await search(vector,(specific.length?specific:terms).join(' OR '));
 const score=(d:any)=>terms.reduce((n:number,t:string)=>n+((d.title+' '+d.section_hint).toLowerCase().includes(t)?4:0)+(d.excerpt.toLowerCase().includes(t)?1:0),0);
 results.sort((a:any,b:any)=>score(b)-score(a));}
 if(grading&&courseLevel(p.program)==='master'){
  const levelSpecific=await search(null,'master OR resit');
  for(const row of levelSpecific)if(!results.some((x:any)=>x.chunk_id===row.chunk_id))results.push(row);
 }
 // Defense in depth: smoke fixtures and candidate documents never become policy answers.
 const eligible=(d:any)=>d.approval_status==='approved'&&d.audience!=='staff'&&d.audience!=='sensitive_support'&&
  (!d.applicable_pool||d.applicable_pool===p.institution||d.applicable_pool==='SHARED')&&
  (!d.program||d.program===p.program)&&
  (p.institution!=='SHARED'||(d.scope_verified&&['CAFOSCARI','CICC'].every(x=>(d.explicit_applicability||[]).includes(x))))&&
  typeof d.excerpt==='string'&&d.document_sha256&&!(d.validity_flags||[]).includes('superseded');
 const docs=(Array.isArray(results)?results:[]).filter(eligible).filter((d:any)=>!(grading&&courseLevel(p.program)==='master'&&/CAUTION: 40%|PROVISIONAL PASS.*(?:only|applies undergraduate)/i.test(d.section_hint||'')));
 // Repeated handbook pages keep citations in storage, but do not consume all evidence slots.
 const seen=new Set<string>();for(let i=0;i<docs.length;){const k=docs[i].excerpt.replace(/\s+/g,' ').trim();if(seen.has(k))docs.splice(i,1);else{seen.add(k);i++;}}

 if(!docs.length)return null;
 const priority=(d:any)=>(p.program&&d.program===p.program?5:0)+(grading&&courseLevel(p.program)==='master'&&/MASTER LEVEL 7.*threshold|Master L7 threshold/i.test(d.section_hint||'')?15:0)-(grading&&courseLevel(p.program)==='master'&&/CAUTION: 40%|PROVISIONAL PASS.*(?:only|applies undergraduate)/i.test(d.section_hint||'')?10:0);
 docs.sort((a:any,b:any)=>priority(b)-priority(a));
 if(/^hc_[0-9a-f]{24}$/.test(docs[0].chunk_id)){
 const expanded=await fetch(BASE+'/rest/v1/rpc/hf8_library_expand',{method:'POST',headers,body:JSON.stringify({p_ids:docs.slice(0,2).map((d:any)=>d.chunk_id),p_pool:institution,p_program:p.program||null}),signal:AbortSignal.timeout(7000)});
 if(expanded.ok){const more=await expanded.json();for(const x of Array.isArray(more)?more:[])if(eligible(x)&&!docs.some((d:any)=>d.chunk_id===x.chunk_id))docs.push(x);}
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
export async function lookupKnowledge(query:string,req:Request,turns:any[]=[],language='it-IT'){
 const scope=knowledgeScope(await profile(req),[...turns,{role:'user',text:query}]);
 if(needsCourse(query,scope))return {verified:false,matches:[],note:language==='en-US'?'Which specific course or Master is this question about?':'A quale corso o Master si riferisce la domanda?',clarification_required:'course',knowledge_scope:scope};
 const previous=turns.filter(t=>t.role==='user'&&(!namedCourse(t.text)||/[?]/.test(t.text))).at(-1);
 const courseOnly=!!namedCourse(query)&&!/[?]|\b(voto|minimo|quanto|come|qual\w*|esam\w*|pass|what|how|when|where)\b/i.test(query);
 const result=await retrieve(courseOnly&&previous?previous.text+' '+query:query,req,scope);
 return {verified:!!result?.evidence.length,matches:(result?.evidence||[]).slice(0,8).map((x:any)=>({id:x.chunk_id,title:x.title,excerpt:x.excerpt.slice(0,2200),source_url:x.source_url,page_number:x.pdf_page,academic_year:x.academic_year,program:x.program,sha256:x.document_sha256})),note:result?'Use these sourced excerpts; cite title and physical PDF page. Dates apply only to the source year.':'Nessuna fonte pertinente verificata: chiedi una precisazione senza inventare.',retrieval:result?.retrieval||null,knowledge_scope:scope};
}
export async function answer(turns:any[],req:Request,language='it-IT'){
 const query=String(turns.filter(x=>x.role==='user').at(-1)?.text||'').slice(0,1000);
 const route=await routeRequest(query,turns);
 if(route==='operazioni')return {answer:language==='en-US'?'Open Account and continue in your personal chat to check real Student Office availability. For check-in, explain which service you mean. ':language==='es-ES'?'Abre Cuenta y continúa en tu conversación personal para consultar la disponibilidad real de Student Office. Para el check-in, indica a qué servicio te refieres. ':'Apri Account e continua nella chat personale per verificare gli orari reali dello Student Office. Per il check-in, indica a quale servizio ti riferisci. ',citations:[],pool:route,mode:'operation_guidance'};
 if(route==='conversazione'){
 const key=JSON.stringify([query.toLowerCase(),language,turns.slice(-3)]);const cached=await readCache(route,key,BASE,headers);if(cached)return cached;
 const result=await generateReply(turns,language,[],'conversazione');
 const reply={answer:result.answer,citations:[],pool:route,mode:result.mode,generation_model:result.model};
 if(result.mode==='llm')writeCache(route,key,reply,[]);return reply;
 }
 const p=knowledgeScope(await profile(req),turns);const scope=p.institution;
 if(needsCourse(query,p))return {answer:language==='en-US'?'Which course is your question about? For example Digital Management, AI & Data Science or a specific Master.':language==='es-ES'?'¿A qué curso te refieres: Digital Management, AI & Data Science o un máster específico?':'A quale corso si riferisce la domanda: Digital Management, AI & Data Science oppure quale Master?',citations:[],pool:route,mode:'course_clarification'};
 // Scope + language + recent dialogue keep caches from crossing identities or unresolved follow-ups.
 const cacheKey=JSON.stringify(['semantic-rag-v1',query.toLowerCase(),scope,p.program,language,turns.slice(-3)]);
 const cached=await readCache(route,cacheKey,BASE,headers);if(cached)return cached;
 const followup=/^(e (?:in|per|se)|and (?:in|if)|invece (?:in|per)|quindi)\b/i.test(query.trim());
 const previousUsers=turns.filter(t=>t.role==='user').slice(0,-1);
 if(followup&&!previousUsers.length)return {answer:'A quale situazione ti riferisci?',citations:[],pool:route,mode:'clarification'};
 const courseReply=!!namedCourse(query)&&query.length<90&&previousUsers.length>0&&!/[?]|\b(voto|minimo|quanto|come|qual\w*|esam\w*|pass|what|how|when|where)\b/i.test(query);
 const searchQuery=followup||courseReply?String(previousUsers.at(-1)?.text||'')+' '+query:query;
 const doc=await retrieve(searchQuery,req,p);
 if(!doc)return {answer:language==='en-US'?'I could not find a reliable source for this. Which rule or service do you mean?':language==='es-ES'?'No encuentro una fuente fiable. ¿A qué norma o servicio te refieres?':'Non trovo una fonte affidabile per questa domanda. A quale regola o servizio ti riferisci?',citations:[],pool:route,mode:'no_source'};
 const result=await generateReply(turns,language,doc.evidence,route);
 const selected=doc.evidence.filter((d:any)=>result.source_ids.includes(d.chunk_id));
 const citations=selected.map((d:any)=>({id:d.chunk_id,title:d.title,page:d.pdf_page,url:d.source_url,sha256:d.document_sha256,demo_approved:(d.validity_flags||[]).includes('demo_approved_not_institutionally_reviewed')}));
 const reply={answer:result.answer,citations,pool:route,mode:result.mode,generation_model:result.model,retrieval:doc.retrieval,source_status:citations.length?'demo_approved':'no_source',knowledge_scope:{institution:p.institution,program:p.program,source:p.source}};
 if(result.mode==='llm'&&citations.length)writeCache(route,cacheKey,reply,selected);return reply;
}
export async function operation(b:any,u:any,s:string,req:Request,db?:any,hash?:any,base=BASE,key=KEY,context:any[]=[]){
 if(BASE.includes('oxzraaadxqsruibinlxn')&&b.operation!=='knowledge')return productionOperation(b,u,s,req,db,hash,base,key);
 if(b.operation==='status')return {draft:null,preview:true};
 if(b.operation==='slots')return {slots:[],calendar_connected:false,preview:true};
 if(b.operation==='profile')return {profile:await profile(req)};
 if(b.operation==='knowledge')return lookupKnowledge(String(b.query||'').slice(0,1000),req,context,b.language||'it-IT');
 throw Object.assign(Error('Operazioni esterne disabilitate in Preview. Nessun appuntamento o invio è stato eseguito.'),{status:403});
}
