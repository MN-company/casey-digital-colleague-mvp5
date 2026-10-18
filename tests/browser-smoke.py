from playwright.sync_api import sync_playwright
from urllib.parse import urlparse
import mimetypes
from pathlib import Path
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page()
 def serve_local(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'
  target=(root/rel).resolve()
  if not target.is_relative_to(root) or not target.is_file():
   route.fulfill(status=404,body='not found')
  else:
   route.fulfill(status=200,body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0] or 'application/octet-stream',headers={'access-control-allow-origin':'*'})

 page.route('https://cdn.tailwindcss.com/**',lambda route:route.fulfill(status=200,body=''))
 def mock(route):
  data=route.request.post_data_json or {}
  action=data.get('action')
  body={'session':{'token':'d'*72,'expires_in':86400},'auth_profile':{'profile':{'authenticated':False,'registered':False}},'student_requests':{'requests':[]},'availability_month':{'slots':[]},'public_config':{'oauth_configured':False}}
  route.fulfill(status=200,content_type='application/json',body=__import__('json').dumps(body.get(action,{})),headers={'access-control-allow-origin':'*'})
 page.route('https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-original-ui',mock)
 # Simulate TTS outage; must fall back safely (browser voice may not be installed in CI).
 page.route('https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-tts',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"unavailable"}',headers={'access-control-allow-origin':'*'}))
 errors=[]
 page.on('pageerror',lambda error: errors.append(str(error)))
 source=(root/'index.html').read_text()
 injected=(root/'casey-voice.js').read_text()
 source=source.replace('<script src="config.js"></script>', '').replace('<script src="auth.js"></script>', '').replace('<script src="casey-voice.js"></script>', '').replace('<script src="casey-bridge.js"></script>', '')
 source=source.replace('  <script>', '  <script>window.CASEY_CONFIG={ttsUrl:"https://project.supabase.co/tts"};</script><script>'+injected+'</script>  <script>',1)
 page.set_content(source,wait_until='domcontentloaded')
 page.wait_for_timeout(800)
 assert page.locator('#languageSelect option').count()==3
 assert page.locator('#languageSelect').input_value()=='it-IT'
 assert page.evaluate('typeof window.CaseyVoice.speak')=='function'
 page.locator('#languageSelect').select_option('es-ES')
 assert page.evaluate('window.CaseyVoice.getLanguage()')=='es-ES'
 page.locator('#languageSelect').select_option('en-US')
 assert page.evaluate('window.CaseyVoice.getLanguage()')=='en-US'
 assert page.locator('#elevenBtn').count()==0
 assert page.locator('#browserVoiceNotice').count()==0
 assert not errors, errors
 print('OK: browser UI displays IT/EN/ES, switches language, no ElevenLabs, no JS exceptions.')
 browser.close()
