import {assertEquals,assertRejects} from 'jsr:@std/assert@1.0.14';
Deno.env.set('SUPABASE_URL','https://sneaxpqnmlhnrhoautjx.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-only');
Deno.env.set('GEMINI_API_KEY','');
const {retrieve}=await import('../supabase/functions/_shared/definitivo-preview.ts');
const fixture={chunk_id:'test-chunk',title:'Approved test document',pdf_page:2,excerpt:'Test excerpt, not an institutional policy.',document_sha256:'a'.repeat(64),approval_status:'approved',source_url:'https://example.invalid/policy',validity_flags:[]};
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
