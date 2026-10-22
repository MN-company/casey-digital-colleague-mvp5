import {operation} from '../supabase/functions/_shared/handoff-operations.ts';
const assert=(v:unknown,message:string)=>{if(!v)throw new Error(message);};
Deno.test('Production gateway binds confirmation to session, encrypts credentials and retries one request only',async()=>{
 const oldFetch=globalThis.fetch;let commits=0,prepares=0,locked=false;const drafts:any[]=[];let session:any=null;
 const db=async(path:string,body?:any,method?:string)=>{
  if(path==='rpc/hf7_operation_lock'){if(locked)return false;locked=true;return true;}
  if(path.startsWith('hf7_operation_locks?')){locked=false;return null;}
  if(path.startsWith('dc_sessions')){if(body&&!method){session={id:'op-session',...body};return [session];}return session?[session]:[];}
  if(path.startsWith('hf7_operation_drafts')){
   if(body&&method==='PATCH'){Object.assign(drafts.at(-1),body);return drafts;}
   if(body){const d={id:crypto.randomUUID(),status:'prepared',...body};drafts.push(d);return [d];}
   return drafts.slice(-1);
  }
  throw new Error('Unexpected DB call '+path);
 };
 globalThis.fetch=async(_input:any,init:any)=>{const b=JSON.parse(init.body);if(b.action==='prepare'){prepares++;return Response.json({request_id:'request-1',confirmation_token:'secret-confirmation-token',slot:{starts_at:'2030-01-01T10:00:00Z'},email:'student@example.test',expires_in:300});}if(b.action==='commit'){commits++;assert(b.confirmation_token==='secret-confirmation-token','Cipher must decrypt server-side');assert(b.request_id==='request-1','Retry must retain request');return Response.json({saved:true,google_sync:'created'});}if(b.action==='operation_status')return Response.json({saved:true,google_sync:'created'});throw new Error('Unexpected action');};
 const req=new Request('https://example.test',{headers:{'x-student-token':'verified-auth'}}),hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
 const call=(b:any,s='phone-one')=>operation({chat_id:'chat-1',...b},{id:'owner-1'},s,req,db,hash,'https://project.supabase.co','server-secret-only');
 try{
  const prepared=await call({operation:'prepare',slot_id:'slot-1'});assert(!JSON.stringify(prepared).includes('secret-confirmation-token'),'Original credential must never reach browser');assert(drafts[0].confirmation_cipher!=='secret-confirmation-token','Draft must be encrypted at rest');
  await call({operation:'prepare',slot_id:'slot-1'});assert(prepares===1,'Repeated preparation must reuse valid draft');
  let rejected=false;try{await call({operation:'commit',draft_id:prepared.draft.id,confirmation_nonce:prepared.draft.confirmation_nonce,confirmed:true},'phone-two');}catch(e){rejected=(e as any).status===403;}assert(rejected&&commits===0,'Other session cannot reuse confirmation');
  rejected=false;try{await call({operation:'commit',draft_id:prepared.draft.id,confirmation_nonce:prepared.draft.confirmation_nonce});}catch(e){rejected=(e as any).status===403;}assert(rejected&&commits===0,'Explicit confirmation is mandatory');
  const args={operation:'commit',draft_id:prepared.draft.id,confirmation_nonce:prepared.draft.confirmation_nonce,confirmed:true};await call(args);await call(args);assert(commits===1,'Duplicate button submission must not create another booking');
  locked=true;rejected=false;try{await call({operation:'prepare',slot_id:'slot-2'});}catch(e){rejected=(e as any).status===409;}assert(rejected,'Concurrent preparation must be rejected');
 }finally{globalThis.fetch=oldFetch;}
});
