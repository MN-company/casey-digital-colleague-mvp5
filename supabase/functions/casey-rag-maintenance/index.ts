/** Service-role-only, bounded, resumable embedding backfill. No text/scope/approval writes. */
import {embedTexts,EMBEDDING_TAG} from '../_shared/embeddings.ts';
import {answer,retrieve} from '../_shared/definitivo-preview.ts';
const BASE=Deno.env.get('SUPABASE_URL')||'';
const KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
if(!['https://oxzraaadxqsruibinlxn.supabase.co','https://sneaxpqnmlhnrhoautjx.supabase.co'].includes(BASE))throw Error('Unexpected project');
async function db(path:string,body?:unknown,method?:string){
 const r=await fetch(BASE+'/rest/v1/'+path,{method:method||(body?'PATCH':'GET'),headers:{apikey:KEY,...(KEY.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+KEY}),'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!r.ok){const e=await r.json().catch(()=>({}));throw Error('Embedding storage '+r.status+': '+String(e.message||e.code||'unavailable').slice(0,220));}return r.json();
}
Deno.serve(async req=>{
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!KEY||!authorization.startsWith('Bearer '))return json({error:'Service role required'},403);
 if(authorization!=='Bearer '+KEY){
  // A still-valid legacy service JWT can differ from the runtime's current key.
  // Validate its admin privileges with Auth; never trust a decoded role claim alone.
  const admin=await fetch(BASE+'/auth/v1/admin/users?per_page=1',{headers:{apikey:authorization.slice(7),Authorization:authorization},signal:AbortSignal.timeout(8000)});
  await admin.body?.cancel();if(!admin.ok)return json({error:'Service role required'},403);
 }
 try{
  const body=await req.json();
  if(body.action==='embed'){
   if(!Array.isArray(body.texts)||!body.texts.length||body.texts.length>100||body.texts.some((x:any)=>typeof x!=='string'||x.length>7000))return json({error:'Invalid embedding input'},400);
   return json({model:EMBEDDING_TAG,vectors:await embedTexts(body.texts,body.task==='RETRIEVAL_QUERY'?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT')});
  }
  if(body.action==='evaluate'){
   const turns=(Array.isArray(body.turns)?body.turns:[]).filter((t:any)=>['user','assistant'].includes(t?.role)&&typeof t.text==='string').slice(-10);
   if(!turns.length||turns.some((t:any)=>t.text.length>1000))return json({error:'Invalid evaluation input'},400);
   const headers=new Headers();const student=req.headers.get('x-student-token');if(student)headers.set('x-student-token',student);
   return json(await answer(turns,new Request(req.url,{headers}),body.language||'it-IT'));
  }
  if(body.action==='status'){
   const rows:any[]=[];for(let offset=0;offset<10000;offset+=1000){const page=await db('hf8_source_chunks?select=id,embedding_model,embedded_at&limit=1000&offset='+offset);rows.push(...page);if(page.length<1000)break;}
   return json({model:EMBEDDING_TAG,total:rows.length,embedded:rows.filter((x:any)=>x.embedding_model===EMBEDDING_TAG&&x.embedded_at).length});
  }
  if(body.action!=='backfill')return json({error:'Unknown maintenance action'},400);
  const limit=Math.max(1,Math.min(100,Number(body.limit)||60));
  const rows=await db('hf8_source_chunks?'+new URLSearchParams({select:'id,content,content_sha256,d:hf8_source_documents!inner(source_provenance)',embedding:'is.null','d.source_provenance':'neq.qa_synthetic_fixture',order:'id',limit:String(limit)}));
  if(!rows.length)return json({updated:0,complete:true,model:EMBEDDING_TAG});
  const groups=new Map<string,any[]>();for(const row of rows){const group=groups.get(row.content_sha256)||[];group.push(row);groups.set(row.content_sha256,group);}
  const hashes=[...groups.keys()];
  const existing=await db('hf8_source_chunks?'+new URLSearchParams({select:'content_sha256,embedding',embedding_model:'eq.'+EMBEDDING_TAG,content_sha256:'in.('+hashes.join(',')+')',embedding:'not.is.null',limit:'3000'}));
  const vectors=new Map<string,any>(existing.map((x:any)=>[x.content_sha256,x.embedding]));
  const missing=hashes.filter(h=>!vectors.has(h));
  if(missing.length){const generated=await embedTexts(missing.map(h=>groups.get(h)![0].content),'RETRIEVAL_DOCUMENT');missing.forEach((h,i)=>vectors.set(h,generated[i]));}
  // Identical source text shares one vector across handbook occurrences.
  const targets=await db('hf8_source_chunks?'+new URLSearchParams({select:'id,content_sha256,d:hf8_source_documents!inner(source_provenance)',content_sha256:'in.('+hashes.join(',')+')',embedding:'is.null','d.source_provenance':'neq.qa_synthetic_fixture',limit:'3000'}));
  let updated=0;
  for(let i=0;i<targets.length;i+=100)updated+=await db('rpc/hf8_store_embeddings',{p_rows:targets.slice(i,i+100).map((r:any)=>({id:r.id,content_sha256:r.content_sha256,embedding:typeof vectors.get(r.content_sha256)==='string'?JSON.parse(vectors.get(r.content_sha256)):vectors.get(r.content_sha256),embedding_model:EMBEDDING_TAG}))},'POST');
  return json({updated,provider_texts:missing.length,complete:false,model:EMBEDDING_TAG});
 }catch(e){return json({error:(e as Error).message},(e as any).status===429?429:503);}
});
