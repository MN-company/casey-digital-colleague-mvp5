import {assertEquals,assertRejects} from 'jsr:@std/assert@1.0.14';
Deno.env.set('SUPABASE_URL','https://sneaxpqnmlhnrhoautjx.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-only');
Deno.env.set('GEMINI_API_KEY','');
const {retrieve,libraryKeywords}=await import('../supabase/functions/_shared/definitivo-preview.ts');
const fixture={scope_verified:true,explicit_applicability:['CAFOSCARI','CICC'],chunk_id:'test-chunk',title:'Approved test document',pdf_page:2,excerpt:'Test excerpt, not an institutional policy.',document_sha256:'a'.repeat(64),approval_status:'approved',source_url:'https://example.invalid/policy',validity_flags:[]};
Deno.test('Anonymous requests use existing hf8 RAG with SHARED and candidates disabled',async()=>{
 const original=globalThis.fetch;let args:any;
 globalThis.fetch=async(input,init)=>{const url=String(input);assertEquals(url.endsWith('/rest/v1/rpc/hf8_search_hybrid'),true);args=JSON.parse(String((init as any)?.body));return Response.json([fixture]);};
 try{const r=await retrieve('test policy',new Request('https://example.invalid'));assertEquals(args.p_pool,'SHARED');assertEquals(args.p_allow_candidate,false);assertEquals(r?.fonti[0].sha256,fixture.document_sha256);}finally{globalThis.fetch=original;}
});
Deno.test('Existing smoke fixtures never become policy answers',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json([{...fixture,approval_status:'candidate'}]);
 try{assertEquals(await retrieve('test policy',new Request('https://example.invalid')),null);}finally{globalThis.fetch=original;}
});
Deno.test('Institution is taken from server roster, never editable Auth metadata',async()=>{
 const original=globalThis.fetch;let args:any;
 globalThis.fetch=async(input,init)=>{const url=String(input);if(url.endsWith('/auth/v1/user'))return Response.json({email:'qa@example.invalid',email_confirmed_at:'2026-01-01',user_metadata:{institution:'CICC'}});if(url.includes('dc_v4_student_roster?'))return Response.json([{institution:'CAFOSCARI',program:'DIGITAL_MANAGEMENT'}]);args=JSON.parse(String((init as any)?.body));return Response.json([]);};
 try{await retrieve('CICC test policy',new Request('https://example.invalid',{headers:{'x-student-token':'test-only'}}));assertEquals(args.p_pool,'CAFOSCARI');assertEquals(args.p_program,'DIGITAL_MANAGEMENT');}finally{globalThis.fetch=original;}
});
Deno.test('RAG failure is explicit with no ZIP or offline fallback',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'unavailable'},{status:503});
 try{await assertRejects(()=>retrieve('test policy',new Request('https://example.invalid')),Error,'Ricerca documentale non disponibile');}finally{globalThis.fetch=original;}
});

Deno.test('Natural questions yield content keywords with explicit lexical synonyms',()=>{
 assertEquals(libraryKeywords('Posso portare il cane in campus?'),['portare','cane','animali','campus']);
});
Deno.test('Demo approval is explicitly labelled and historical dates are qualified',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json([{...fixture,academic_year:'2023/2024',validity_flags:['demo_approved_not_institutionally_reviewed','historical_academic_year']}]);
 try{const d=await retrieve('test policy',new Request('https://example.invalid'));assertEquals(d?.etichetta.startsWith('Fonte approvata per la demo:'),true);assertEquals(!!d?.avvertenza,true);}finally{globalThis.fetch=original;}
});
Deno.test('Lexical fallback retains institution and candidate filters',async()=>{
 const original=globalThis.fetch;const args:any[]=[];globalThis.fetch=async(_input,init)=>{const q=JSON.parse(String((init as any).body));args.push(q);return Response.json(args.length===1?[]:[fixture]);};
 try{await retrieve('Posso portare il cane in campus?',new Request('https://example.invalid'));assertEquals(args[1].p_query,'portare OR cane OR animali OR campus');assertEquals(args[1].p_pool,'SHARED');assertEquals(args[1].p_allow_candidate,false);}finally{globalThis.fetch=original;}
});

Deno.test('Answers read the structured card tied to the retrieved source',async()=>{
 const original=globalThis.fetch;const id='hc_'+'c'.repeat(24);
 globalThis.fetch=async input=>String(input).includes('casey_biblioteca_schede?')?Response.json([{id,sezione:'Regola',tipo:'requirement',testo_originale:'Original structured card text.',requisiti_estratti:['Original requirement.']} ]):Response.json([{...fixture,chunk_id:id}]);
 try{const d=await retrieve('test policy',new Request('https://example.invalid'));assertEquals(d?.testo,'Original structured card text.');assertEquals(d?.scheda?.id,id);}finally{globalThis.fetch=original;}
});
Deno.test('Anonymous answers exclude shared rows scoped to a single university',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json([{...fixture,explicit_applicability:['CICC']}]);
 try{assertEquals(await retrieve('test policy',new Request('https://example.invalid')),null);}finally{globalThis.fetch=original;}
});
