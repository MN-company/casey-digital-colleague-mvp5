(() => {
 'use strict';const $=id=>document.getElementById(id),input=$('chatInput'),action=$('composerAction');
 const wave='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg>',arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 11 6-6 6 6M12 5v14"/></svg>',stop='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"/></svg>';
 const sources=new Map();let firstName='';
 function welcomeTitle(name){return name?'Ciao '+name+', sono Casey.':'Ciao, sono Casey.';}
 if(new URLSearchParams(location.search).get('theme')==='campus'){document.body.classList.add('theme-campus');document.querySelector('.casey-mark img').src='Casey - H-FARM/casey-face.png';}
 function paint(){const v=window.CaseyVoiceSession?.state||'idle';const active=v!=='idle';const hasText=!!input.value.trim();const state=active?'stop':hasText?'send':'voice';action.dataset.state=v==='connecting'?'connecting':state;action.innerHTML=state==='stop'?stop:state==='send'?arrow:wave;const label=state==='stop'?'Termina conversazione vocale':state==='send'?'Invia messaggio':'Parla con Casey';action.setAttribute('aria-label',label);action.title=label;document.body.classList.toggle('voice-on',active);input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px';}
 async function toggleDrawer(open){if(open){$('chatDrawer').hidden=false;$('chatDrawerScrim').hidden=false;$('chatDrawerToggle').setAttribute('aria-expanded','true');$('libraryButton').click();$('closeChatDrawer').focus();}else{$('chatDrawer').hidden=true;$('chatDrawerScrim').hidden=true;$('chatDrawerToggle').setAttribute('aria-expanded','false');}}
 window.CaseyChatDrawer={close:()=>void toggleDrawer(false)};
 $('chatDrawerToggle').onclick=()=>void toggleDrawer(true);$('closeChatDrawer').onclick=()=>$('chatDrawer').hidden?null:void toggleDrawer(false);$('chatDrawerScrim').onclick=()=>void toggleDrawer(false);
 $('quickNewChat').onclick=()=>$('newChatButton').click();
 input.addEventListener('input',()=>{if(input.value.trim()&&window.CaseyVoiceSession?.state!=='idle')void CaseyVoiceSession.stop();paint();});
 action.onclick=()=>{if(CaseyVoiceSession.state!=='idle')void CaseyVoiceSession.stop();else if(input.value.trim())$('chatForm').requestSubmit();else void CaseyVoiceSession.start();};
 $('attachmentButton').onclick=()=>{$('attachmentHint').hidden=!$('attachmentHint').hidden;};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')void toggleDrawer(false);});
 function decorate(){const messages=$('chatMessages');if(!CaseyDialogue.snapshot().length){if(!messages.querySelector('.chat-empty')){const empty=document.createElement('div');empty.className='chat-empty';const h=document.createElement('h2');h.textContent=welcomeTitle(firstName);const p=document.createElement('p');p.textContent='Dimmi pure.';empty.append(h,p);messages.append(empty);}}else messages.querySelector('.chat-empty')?.remove();
 const heading=messages.querySelector('.chat-empty h2');if(heading)heading.textContent=welcomeTitle(firstName);
 const nodes=[...messages.querySelectorAll('.chat-message')];for(const [i,items] of sources){const node=nodes[i];if(!node||node.querySelector('.chat-citations')||!items.length)continue;const details=document.createElement('details');details.className='chat-citations';const summary=document.createElement('summary');summary.textContent='Fonti';details.append(summary);for(const source of items){const p=document.createElement('p');p.textContent=source.title+(source.page?' · p. '+source.page:'');details.append(p);}node.append(details);}paint();}
 window.addEventListener('casey:profile',e=>{firstName=e.detail?.first_name||'';decorate();});
 void window.CaseyAccount?.profile().then(p=>{firstName=p?.first_name||'';decorate();}).catch(()=>{});
 window.CaseyChatSources={set(i,items){sources.set(i,items);decorate();}};
 window.addEventListener('casey:voice',paint);window.addEventListener('casey:dialogue',()=>requestAnimationFrame(decorate));
 new MutationObserver(()=>{if(!$('conversation').hidden)requestAnimationFrame(decorate);}).observe($('conversation'),{attributes:true,attributeFilter:['hidden']});
 // The hamburger loads history without leaving the current conversation.
 window.CaseyOpenHistory=async()=>{const r=await HandoffAPI.call('list');$('chatLibrary').replaceChildren();for(const c of r.chats){const b=document.createElement('button');b.textContent=c.title;b.onclick=async()=>{const d=await HandoffAPI.call('restore',{chat_id:c.id});HandoffAPI.saveSession(d.session_token);sessionStorage.setItem('casey-handoff-v2-chat-id',d.chat_id);location.reload();};$('chatLibrary').append(b);}};
 $('libraryButton').onclick=()=>void window.CaseyOpenHistory().catch(e=>{$('chatStatus').textContent=e.message;});
 paint();decorate();
})();
