import {BASE,KEY,SITE,db} from './beta-access.ts';
const encode=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const url64=(bytes:Uint8Array)=>encode(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function validEmail(email:string){return email.length<=254&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email);}
export function accessMessage(sender:string,email:string,code:string,link:string){
 if(!validEmail(sender)||!validEmail(email)||!/^\d{6,8}$/.test(code)||!link.startsWith(BASE+'/auth/v1/verify?'))throw Error('Messaggio di accesso non valido');
 const utf8=new TextEncoder();const body=`Hai richiesto di accedere alla prova Casey.\n\nIl tuo codice monouso: ${code}\n\nInseriscilo nella pagina Prova Casey, oppure apri questo link sul browser della tua prova:\n${link}\n\nNon condividere codice e link: consentono l'accesso alle tue conversazioni. Se non hai fatto questa richiesta ignora il messaggio.\n\nLa verifica email salva le chat, ma non abilita servizi riservati agli studenti.\nCasey - Prova pubblica`;
 return ['From: <'+sender+'>','To: <'+email+'>','Subject: =?UTF-8?B?'+encode(utf8.encode('Il tuo accesso a Casey'))+'?=','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encode(utf8.encode(body))].join('\r\n');
}
export async function sendBetaAccessEmail(email:string){
 if(!validEmail(email))throw Object.assign(Error('Inserisci una email valida'),{status:400});
 const connections=await db('dc_v3_google_connections?'+new URLSearchParams({select:'google_email,refresh_token_ciphertext,refresh_token_iv,granted_scopes',id:'eq.staff',limit:'1'}));
 const c=connections[0];const encryption=Deno.env.get('CASEY_TOKEN_ENCRYPTION_KEY')||'';
 if(!c?.granted_scopes?.includes('https://www.googleapis.com/auth/gmail.send')||!/^[a-f\d]{64}$/i.test(encryption))throw Error('Servizio email non disponibile');
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(encryption.match(/../g)!.map(x=>parseInt(x,16))),'AES-GCM',false,['decrypt']);
 const refresh=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(c.refresh_token_iv)},key,decode(c.refresh_token_ciphertext)));
 const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:Deno.env.get('GOOGLE_CLIENT_ID')||'',client_secret:Deno.env.get('GOOGLE_CLIENT_SECRET')||'',refresh_token:refresh,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
 const google=await auth.json();if(!auth.ok||!google.access_token)throw Error('Servizio email non disponibile');
 const r=await fetch(BASE+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',email,redirect_to:SITE+'/prova.html'}),signal:AbortSignal.timeout(10000)});
 const challenge=await r.json();if(!r.ok||!challenge.email_otp||!challenge.action_link)throw Error('Accesso email non disponibile');
 const raw=accessMessage(c.google_email,email,challenge.email_otp,challenge.action_link);
 const sent=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+google.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:url64(new TextEncoder().encode(raw))}),signal:AbortSignal.timeout(12000)});
 const delivered=await sent.json();if(!sent.ok||!delivered.id)throw Error('Invio email non confermato. Attendi un minuto prima di riprovare.');
 // No OTP, link, refresh token or email body is returned to the browser or logged.
 return {sent:true};
}
