import {assertEquals,assertRejects,assertThrows} from 'jsr:@std/assert@1.0.14';
import {knowledgeScope,namedCourse,needsCourse,COURSES} from '../supabase/functions/_shared/knowledge-scope.ts';
import {normalizedVector,embedTexts,queryVector,EMBEDDING_DIMENSIONS} from '../supabase/functions/_shared/embeddings.ts';
Deno.env.set('SUPABASE_URL','https://sneaxpqnmlhnrhoautjx.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-only');
const {retrieve,answer}=await import('../supabase/functions/_shared/definitivo-preview.ts');
const base={chunk_id:'source-fixture',doc_id:'doc-fixture',title:'Public campus source',pdf_page:47,excerpt:'Student printing credit is purchased at the Welcome Center.',document_sha256:'a'.repeat(64),approval_status:'approved',source_url:'https://example.invalid/source',validity_flags:[],scope_verified:true,explicit_applicability:['CAFOSCARI','CICC'],applicable_pool:'SHARED',program:null};

Deno.test('All fourteen canonical courses map explicitly; Business and Italian ai preposition do not infer a course',()=>{
 for(const c of COURSES)assertEquals(namedCourse(c.program)?.program,c.program);
 assertEquals(namedCourse('Nel corso AI for Business Transformation')?.program,'AI_BUSINESS_TRANSFORMATION');
 assertEquals(namedCourse('Business'),null);assertEquals(namedCourse('Vorrei andare ai servizi del campus'),null);
 assertEquals(namedCourse('International Business Studies')?.program,'INTERNATIONAL_BUSINESS_STUDIES');
 assertEquals(namedCourse('AI & Data Science')?.program,'AI_DATA_SCIENCE');
 assertEquals(namedCourse('Digital Management oppure AI & Data Science'),null);
});
Deno.test('Official course aliases normalize without accepting user metadata or granting personal access',()=>{
 assertEquals(knowledgeScope({institution:'CHICHESTER',program:'Digital Marketing & Data Analytics'}).program,'DIGITAL_MARKETING_DATA_ANALYTICS');
 const p=knowledgeScope({institution:'CAFOSCARI',program:'Digital Management'},[{role:'user',text:'DMDA'}]);
 assertEquals(p.program,'DIGITAL_MANAGEMENT');assertEquals(p.source,'roster');
 assertEquals(knowledgeScope({user_metadata:{institution:'CAFOSCARI',program:'Digital Management'}}).institution,'SHARED');
});
Deno.test('An explicit question or course clarification selects source context only; unknown profiles ask for the course',()=>{
 const p=knowledgeScope({institution:'CICC',program:'Business'},[{role:'user',text:'Quanto serve per passare un esame?'},{role:'assistant',text:'Quale corso?'},{role:'user',text:'DMDA'}]);
 assertEquals(p.program,'DIGITAL_MARKETING_DATA_ANALYTICS');assertEquals(p.source,'question');
 assertEquals(knowledgeScope(null,[{role:'assistant',text:'Digital Management'}]).institution,'SHARED');
 assertEquals(needsCourse('Voto minimo per superare un esame?',{program:null}),true);
 assertEquals(needsCourse('Come posso stampare in campus?',{program:null}),false);
});
Deno.test('Embeddings reject wrong dimensions, zeros and non-finite values',()=>{
 assertThrows(()=>normalizedVector([1,2]));assertThrows(()=>normalizedVector(Array(768).fill(0)));
 assertThrows(()=>normalizedVector(Array(768).fill(NaN)));
 const vector=normalizedVector(Array(768).fill(2));assertEquals(Math.abs(Math.hypot(...vector)-1)<1e-10,true);
});
Deno.test('Document and query embeddings use the documented asymmetric prompts in the same 768d space',async()=>{
 const original=globalThis.fetch;Deno.env.set('GEMINI_API_KEY','test-only');const bodies:any[]=[];
 globalThis.fetch=async(input,init)=>{assertEquals(String(input).includes('gemini-embedding-2:batchEmbedContents'),true);bodies.push(JSON.parse(String((init as any)?.body)));return Response.json({embeddings:[{values:Array(768).fill(1)}]});};
 try{
  await embedTexts(['SOURCE'],'RETRIEVAL_DOCUMENT');await embedTexts(['QUESTION'],'RETRIEVAL_QUERY');
  assertEquals(bodies[0].requests[0].content.parts[0].text,'title: none | text: SOURCE');
  assertEquals(bodies[1].requests[0].content.parts[0].text,'task: search result | query: QUESTION');
  assertEquals(bodies[0].requests[0].outputDimensionality,EMBEDDING_DIMENSIONS);
 }finally{globalThis.fetch=original;Deno.env.set('GEMINI_API_KEY','');}
});
Deno.test('A provider outage retains lexical retrieval, while malformed vectors are never stored or queried',async()=>{
 const original=globalThis.fetch;Deno.env.set('GEMINI_API_KEY','test-only');
 globalThis.fetch=async()=>Response.json({error:{message:'quota'}},{status:429});
 try{assertEquals(await queryVector('unique outage fixture'),null);await assertRejects(()=>embedTexts(['test'],'RETRIEVAL_DOCUMENT'));}
 finally{globalThis.fetch=original;Deno.env.set('GEMINI_API_KEY','');}
});
Deno.test('Hybrid retrieval supplies the real query vector and keeps candidate, course and institution filtering',async()=>{
 const original=globalThis.fetch;Deno.env.set('GEMINI_API_KEY','test-only');let args:any;
 globalThis.fetch=async(input,init)=>{
  if(String(input).includes(':batchEmbedContents'))return Response.json({embeddings:[{values:Array(768).fill(1)}]});
  args=JSON.parse(String((init as any)?.body));return Response.json([base,{...base,chunk_id:'wrong-course',applicable_pool:'CICC',program:'AI_DATA_SCIENCE'},{...base,chunk_id:'candidate',approval_status:'candidate'}]);
 };
 try{const result=await retrieve('Crediti della stampante, fixture semantico',new Request('https://example.invalid'));assertEquals(args.p_embedding.length,768);assertEquals(args.p_pool,'SHARED');assertEquals(args.p_allow_candidate,false);assertEquals(result?.retrieval,'hybrid');assertEquals(result?.evidence.length,1);}
 finally{globalThis.fetch=original;Deno.env.set('GEMINI_API_KEY','');}
});
Deno.test('An ambiguous exam question asks course once, then uses the explicitly selected Master',async()=>{
 const original=globalThis.fetch;Deno.env.set('GEMINI_API_KEY','');let searched=false;
 globalThis.fetch=async()=>{searched=true;return Response.json([]);};
 try{const result=await answer([{role:'user',text:'Quanto serve per superare un esame?'}],new Request('https://example.invalid'));assertEquals(result.mode,'course_clarification');assertEquals(searched,false);}
 finally{globalThis.fetch=original;}
});

Deno.test('A Master grading query ranks the sourced L7 rule above a generic undergraduate paragraph',async()=>{
 const original=globalThis.fetch;Deno.env.set('GEMINI_API_KEY','');
 const program='DIGITAL_MARKETING_DATA_ANALYTICS';
 globalThis.fetch=async()=>Response.json([
  {...base,chunk_id:'undergraduate',applicable_pool:'CICC',program,pdf_page:8,scope_verified:false,section_hint:'CAUTION: 40% mentioned for undergraduate levels L4-L6',excerpt:'Synthetic undergraduate grading context: 40%.'},
  {...base,chunk_id:'master-rule',applicable_pool:'CICC',program,pdf_page:11,scope_verified:false,section_hint:'MASTER LEVEL 7 pass threshold 50%',excerpt:'Synthetic level-seven grading context: 50%.'}
 ]);
 try{const result=await retrieve('Voto minimo per superare un esame DMDA',new Request('https://example.invalid'));
  assertEquals(result?.evidence[0].chunk_id,'master-rule');assertEquals(result?.evidence[0].pdf_page,11);
 }finally{globalThis.fetch=original;}
});
