from pathlib import Path
import hashlib,base64,re,json
root=Path(__file__).resolve().parent.parent
files=['index.html','app-blu.html','app-rossa.html','college.html','settings.html']
hashes=set()
for f in files:
 for code in re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',(root/f).read_text()):
  if code.strip():hashes.add("'sha256-"+base64.b64encode(hashlib.sha256(code.encode()).digest()).decode()+"'")
policy="default-src 'self'; script-src 'self' "+' '.join(sorted(hashes))+"; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://generativelanguage.googleapis.com; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
p=root/'vercel.json';d=json.loads(p.read_text());d['headers']=[x for x in d['headers'] if not x.get('source','').startswith('/:page(') and x.get('source')!='/']
for source in ['/', '/:page(index.html|app-blu.html|app-rossa.html|college.html|settings.html)']:d['headers'].append({'source':source,'headers':[{'key':'Content-Security-Policy','value':policy}]})
p.write_text(json.dumps(d,indent=2)+'\n');print('CSP hashes refreshed for primary app surfaces')
