/* Supabase Auth, verified email OTP. No credentials or student numbers are accepted as passwords. */
(function(root, factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CaseyAuth=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const STORAGE=typeof window!=='undefined'&&window.CASEY_CONFIG?.authStorageKey||'casey-v4-auth';
 let current=null;
 function restore(){try{const o=JSON.parse(sessionStorage.getItem(STORAGE)||'null');if(o&&o.expires_at>Date.now()+30000)current=o;}catch{}return current;}
 function get(){if(!current)restore();if(current&&current.expires_at<=Date.now()+30000)clear();return current;}
 function clear(){current=null;try{sessionStorage.removeItem(STORAGE);}catch{}}
 function persist(data){current={access_token:data.access_token,email:data.user?.email||'',expires_at:Date.now()+Number(data.expires_in||3600)*1000};try{sessionStorage.setItem(STORAGE,JSON.stringify(current));}catch{}return current;}
 async function authRequest(path,body){const url=(typeof window!=='undefined'?window.CASEY_CONFIG?.supabaseUrl:'')||'';const key=(typeof window!=='undefined'?window.CASEY_CONFIG?.publishableKey:'')||'';if(!url||!key)throw new Error('La verifica email non è configurata');
  const r=await fetch(url+'/auth/v1/'+path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(16000)});
  const result=await r.json().catch(()=>({}));if(!r.ok)throw new Error(result.msg||result.error_description||result.message||'Autenticazione non riuscita');return result;}
 async function sendCode(email){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Indirizzo email non valido');return authRequest('otp',{email:email.trim().toLowerCase(),create_user:true});}
 async function verifyCode(email,code){if(!/^\d{6,8}$/.test(String(code).trim()))throw new Error('Il codice deve contenere 6–8 cifre');const result=await authRequest('verify',{email:email.trim().toLowerCase(),token:String(code).trim(),type:'email'});if(!result.access_token||!result.user?.email_confirmed_at)throw new Error('Email non verificata');return persist(result);}
 async function signInWithPassword(email,password){if(!email||!password)throw new Error('Inserisci email e password');const d=await authRequest('token?grant_type=password',{email:email.trim().toLowerCase(),password});if(!d.access_token)throw new Error('Accesso non riuscito');return persist(d);}

 function mountPassword(){
   const otp=document.getElementById('caseyOtpStart');
   if(!otp || document.getElementById('caseyPasswordForm'))return;
   const intro=document.querySelector('#caseyAuthOverlay .casey-auth-dialog > p');
   if(intro)intro.textContent='Accedi con email e password oppure con un codice OTP. Per prenotare devi essere nel registro studenti verificato.';
   const f=document.createElement('form'); f.id='caseyPasswordForm';
   f.style.cssText='margin:0 0 14px;padding-bottom:14px;border-bottom:1px solid #cbd5e1';
   f.innerHTML='<label class="text-xs font-bold" for="caseyPwEmail">Email studente</label><input id="caseyPwEmail" type="email" autocomplete="username" placeholder="nome@student.h-farm.com" style="width:100%;margin-bottom:8px" required><label class="text-xs font-bold" for="caseyPwValue">Password</label><input id="caseyPwValue" type="password" autocomplete="current-password" style="width:100%;margin-bottom:9px" required><button type="submit" class="casey-bridge-action">Accedi con password</button>';
   otp.parentNode.insertBefore(f,otp);
   f.addEventListener('submit', async e=>{
      e.preventDefault();const feedback=document.getElementById('caseyAuthFeedback'), btn=f.querySelector('button');
      btn.disabled=true;feedback.textContent='Accesso in corso…';
      try{await signInWithPassword(document.getElementById('caseyPwEmail').value,document.getElementById('caseyPwValue').value);location.reload();}
      catch(err){feedback.textContent=String(err.message||err);btn.disabled=false;}
   });
 }
 if(typeof document!=='undefined'){
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPassword);
   else mountPassword();
 }
 return {get,clear,sendCode,verifyCode,signInWithPassword};
});
