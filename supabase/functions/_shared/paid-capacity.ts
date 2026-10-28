import {db,hash,checked} from './beta-access.ts';
export type Admission={subject:string,id:string,expires_at?:string,seconds?:number};
async function paid(subject:string,action:string,id:string){return checked(await db('rpc/casey_paid_access',{p_hash:await hash('paid:'+subject),p_action:action,p_request:id}));}
export async function reservePaidText(subject:string):Promise<Admission>{const id=crypto.randomUUID();await paid(subject,'text',id);return {subject,id};}
export async function finishPaidText(a:Admission){await paid(a.subject,'finish',a.id);}
export async function withPaidText<T>(subject:string,run:()=>Promise<T>):Promise<T>{const admission=await reservePaidText(subject);try{return await run();}finally{await finishPaidText(admission);}}
export async function reservePaidVoice(subject:string):Promise<Admission>{const id=crypto.randomUUID();const r=await paid(subject,'voice',id);return {subject,id,expires_at:r.expires_at,seconds:r.seconds};}
export async function abortPaidVoice(a:Admission){await paid(a.subject,'voice_abort',a.id);}

export async function finishPaidVoice(a:Admission){await paid(a.subject,'voice_end',a.id);}
