from playwright.sync_api import sync_playwright
import pathlib,json,os
BASE=os.getenv('CASEY_TEST_URL','http://127.0.0.1:4173');account=json.load(open(os.environ['CASEY_HANDOFF_ACCOUNTS']))[2]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);desktop=browser.new_context();page=desktop.new_page();page.goto(BASE,wait_until='networkidle');engine=page.evaluate("JSON.parse(sessionStorage.getItem(CASEY_CONFIG.sessionStorageKey)).token");page.evaluate("CaseyDialogue.append('user','Prenota martedì alle 15');CaseyDialogue.append('user','No, venerdì alle 16');CaseyDialogue.append('user','Annulla la prenotazione')")
 with page.expect_response(lambda r:r.url.endswith('/casey-handoff') and r.request.post_data_json.get('action')=='issue') as response:page.locator('#handoffStart').click()
 link=response.value.json();phone=browser.new_context(viewport={'width':393,'height':852});m=phone.new_page();errors=[];m.on('pageerror',lambda e:errors.append(str(e)));failed=[False]
 def intercept(route):
  data=route.request.post_data_json
  if data.get('action')=='claim' and not failed[0]:
   r=route.fetch();assert r.status==200;failed[0]=True;route.abort('connectionfailed')
  else:route.continue_()
 m.route('**/functions/v1/casey-handoff',intercept);m.goto(BASE+'/college.html#handoff='+link['token']);m.locator('#email').fill(account['email']);m.locator('#password').fill(account['password']);m.locator('#collegeLogin button').click();m.wait_for_function("document.getElementById('collegeLogin').querySelector('button').disabled===false");assert failed[0];m.locator('#resumeButton').click();m.wait_for_selector('#conversation:not([hidden])');assert m.evaluate('CaseyDialogue.snapshot().length')==3;print('PASS lost claim acknowledgement recovers without duplicate import',flush=True);retired=page.evaluate("token=>fetch(CASEY_CONFIG.apiUrl,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token},body:JSON.stringify({action:'auth_profile'})}).then(r=>r.status)",engine);assert retired==401;print('PASS original kiosk engine session is revoked after transfer',flush=True)
 assert m.locator('#operationCard').is_hidden();print('PASS cancelled appointment does not reappear as booking card',flush=True)
 # Interrupt a save response while a second turn arrives; server must contain both afterwards.
 delayed=[False]
 def delay_save(route):
  data=route.request.post_data_json
  if data.get('action')=='save' and not delayed[0]:
   delayed[0]=True;r=route.fetch();m.evaluate("CaseyDialogue.append('assistant','Seconda risposta durante il salvataggio')");route.fulfill(response=r)
  else:route.continue_()
 m.unroute('**/functions/v1/casey-handoff',intercept);m.route('**/functions/v1/casey-handoff',delay_save);m.evaluate("CaseyDialogue.append('user','Domanda per la prova di salvataggio')");m.wait_for_function("document.getElementById('saveStatus').textContent==='Conversazione salvata'");m.wait_for_function("CaseyDialogue.snapshot().length===5 && document.getElementById('saveStatus').textContent==='Conversazione salvata' && !sessionStorage.getItem('casey-draft:'+sessionStorage.getItem('casey-handoff-v2-chat-id'))",timeout=25000)
 result=m.evaluate("HandoffAPI.call('load')");assert result['context'][-1]['text']=='Seconda risposta durante il salvataggio';print('PASS response arriving during save is also persisted',flush=True)
 chat=result['chat_id'];fresh=browser.new_context(viewport={'width':393,'height':852});n=fresh.new_page();n.on('pageerror',lambda e:errors.append(str(e)));n.goto(BASE+'/college.html');n.locator('#email').fill(account['email']);n.locator('#password').fill(account['password']);n.locator('#collegeLogin button').click();n.wait_for_selector('#chatLibrary button');assert n.evaluate("sessionStorage.getItem('casey-handoff-v2-chat-id')")==None;print('PASS new browser lists account chats without a local chat ID',flush=True)
 n.locator('#chatLibrary button').filter(has_text='Prenota martedì').first.click();n.wait_for_selector('#conversation:not([hidden])');assert n.evaluate('CaseyDialogue.snapshot().length')==5;print('PASS full corrected and cancelled conversation restored on another device',flush=True)
 assert m.evaluate("HandoffAPI.call('load').then(r=>r.context.length)")==5;print('PASS original device still has access',flush=True)
 # Draft survives offline save failure and reload, then synchronizes on reconnection.
 def offline(route):
  if route.request.post_data_json.get('action')=='save':route.abort('internetdisconnected')
  else:route.continue_()
 m.unroute('**/functions/v1/casey-handoff',delay_save);m.route('**/functions/v1/casey-handoff',offline);m.evaluate("CaseyDialogue.append('user','Bozza offline da recuperare')");m.wait_for_function("document.getElementById('saveStatus').textContent.includes('non riuscito')");m.unroute('**/functions/v1/casey-handoff',offline);m.reload(wait_until='networkidle');m.wait_for_selector('#conversation:not([hidden])');m.wait_for_function("document.getElementById('saveStatus').textContent==='Conversazione salvata'");assert m.evaluate("HandoffAPI.call('load').then(r=>r.context.at(-1).text)")=='Bozza offline da recuperare';print('PASS offline draft survives reload and is saved after reconnecting',flush=True)
 assert not errors,errors;print('PASS no browser JavaScript errors',flush=True);browser.close()
