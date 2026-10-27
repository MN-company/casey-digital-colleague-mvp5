import {accessMessage,validEmail} from '../supabase/functions/_shared/beta-mail.ts';
function assert(value:unknown,message='Assertion failed'){if(!value)throw Error(message);}
Deno.test('Auth email accepts normal addresses and rejects header injection/multiple recipients',()=>{
 assert(validEmail('test+beta@example.com'));for(const s of ['a@example.com\r\nBcc: x@y.com','a,b@example.com','<a@example.com>','x@y','a b@example.com'])assert(!validEmail(s));
});
Deno.test('Auth MIME contains only recipient, safe headers and an encoded one-time challenge',()=>{
 const url=(Deno.env.get('SUPABASE_URL')||'')+'/auth/v1/verify?token=challenge&type=magiclink';
 const mime=accessMessage('sender@example.com','tester@example.com','123456',url);
 assert(mime.includes('To: <tester@example.com>\r\nSubject:'));assert(!mime.includes('123456'));
 const payload=new TextDecoder().decode(Uint8Array.from(atob(mime.split('\r\n\r\n')[1]),c=>c.charCodeAt(0)));assert(payload.includes('123456'));assert(payload.includes(url));
});
Deno.test('Auth MIME cannot send a challenge to arbitrary redirect/provider links',()=>{
 let rejected=false;try{accessMessage('sender@example.com','tester@example.com','123456','https://attacker.test/');}catch{rejected=true;}assert(rejected);
});
