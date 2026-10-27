#!/usr/bin/env python3
"""Casey 6.0 additive H-FARM handbook import, dry-run by default.

Runs on a trusted developer machine, never in the browser. It only INSERTs
its deterministic hf8 IDs; existing IDs are skipped, never overwritten.
No vector generation is attempted (lexical fallback remains in place).
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
import urllib.request
import urllib.error
from collections import Counter, defaultdict
from pathlib import Path

try:
    import fitz
except ImportError as exc:
    raise SystemExit('Install locally: python -m pip install "PyMuPDF==1.26.7"') from exc

DOCS = [
    ('BSc - DM.pdf', 'CAFOSCARI', 'DIGITAL_MANAGEMENT', '1tNbx3XWkn3r9S3-LTy-x8AASnuCPM_gU', 'Digital Management'),
    ('BSc - AI.pdf', 'CICC', 'AI_DATA_SCIENCE', '1PKfzwnIuSmRWCRwPC_JPW6PmN8Kshbkj', 'AI & Data Science'),
    ('BSc - AI & SPORTS MANAGEMENT.pdf', 'CICC', 'AI_SPORTS_MANAGEMENT', '1HXCPSece2LARt18Zv5kyoGnUot_pZvrR', 'AI & Sports Management'),
    ('BSc - BCE.pdf', 'CICC', 'BUSINESS_CREATION_ENTREPRENEURSHIP', '1fRXkH7u_GJwZ9a04w84YpDo83ID9_5WK', 'Business Creation & Entrepreneurship'),
    ('BSc - DEF .pdf', 'CICC', 'DIGITAL_ECONOMICS_FINANCE', '1WmtGGM6MVUR68sXGI5RsyZba62pqq4Bm', 'Digital Economics & Finance'),
    ('BSc - IBS.pdf', 'CICC', 'INTERNATIONAL_BUSINESS_STUDIES', '1yE953jYMj3uv0ZzAS6yuK1xAwWFBOj4-', 'International Business Studies'),
    ('BSc - MGC .pdf', 'CICC', 'MARKETING_GLOBAL_COMMERCE', '1e7F8SlE4BHlFTMSdzoOU_IxG0QKHkEl2', 'Marketing & Global Commerce'),
    ('BSc - SCA.pdf', 'CICC', 'SOFTWARE_CLOUD_ARCHITECTURE_AI', '1Vgs_GOCw4JxB8kZATTgMEZetcK4YDhCa', 'Software & Cloud Architecture with AI'),
    ('BSc - Foundation Year .pdf', 'CICC', 'FOUNDATION_YEAR', '1VAG0W0x0GIUSvWG-8KrYEAlf6tJWYQxe', 'Foundation Year'),
    ('MSc - AIBT.pdf', 'CICC', 'AI_BUSINESS_TRANSFORMATION', '1t0g7E7qhBNkOro1bRgZAfhw40G_R7JTr', 'AI for Business Transformation'),
    ('MSc - DMDA.pdf', 'CICC', 'DIGITAL_MARKETING_DATA_ANALYTICS', '1RSRQxI7KEh6Io0xEvmgwvTC1lIWZk5R7', 'Digital Marketing & Data Analytics'),
    ('MSc - ESI.pdf', 'CICC', 'ENTREPRENEURSHIP_STARTUP_INNOVATION', '1TNye-PZe1_2-pH5PwzJvoGum0-t7PREG', 'Entrepreneurship, Start Up & Innovation'),
    ('MSc - M8 Design e Comunicazione.pdf', 'CICC', 'DESIGN_COMMUNICATION', '1eApsynaE5g5KZrvvyC41w_OZGM4ylIoD', 'Design & Communication'),
    ('MSc - MIB.pdf', 'CICC', 'INTERNATIONAL_BUSINESS', '13dC1TsvlRwMg__iYMLez7AiXfL7xsGzl', 'International Business'),
]

def digest(t: str) -> str:
    return hashlib.sha256(t.encode('utf-8')).hexdigest()

def clean(s: str) -> str:
    s = s.replace('\x02','-').replace('\ufeff','').replace('\x00','')
    s = re.sub(r'[ \t\u00a0]+',' ',s)
    s = re.sub(r'\n\s*\n\s*\n+','\n\n',s)
    return s.strip()

def split_page(text: str, limit: int = 1150):
    if len(text) <= limit:
        return [text] if len(text) >= 21 else []
    # Preserve paragraph boundaries where available; do not combine pages.
    paragraphs = re.split(r'\n\s*\n', text)
    chunks=[]; curr=''
    for para in paragraphs:
        para=para.strip()
        if not para: continue
        if len(para)>limit:
            # Long Keynote lines are split on natural line boundaries first.
            parts=re.split(r'(?<=[.!?;])\s+|\n',para)
            if len(parts)==1: parts=[para[k:k+limit] for k in range(0,len(para),limit)]
        else:
            parts=[para]
        for part in parts:
            if not part: continue
            if len(curr)+len(part)+2>limit and curr:
                chunks.append(curr);curr=''
            if len(part)>limit:
                chunks.extend(part[k:k+limit] for k in range(0,len(part),limit))
            else:
                curr += ('\n' if curr else '') + part
    if curr:chunks.append(curr)
    return [x for x in chunks if len(x)>20]

def build(root: Path):
    files=[]; rows=[]; zero=[]; used=Counter(); page_hashes=defaultdict(list)
    for name,pool,program,gid,title in DOCS:
        p=root/name
        if not p.is_file(): raise FileNotFoundError(f'Missing original: {p}')
        with p.open('rb') as stream:
            sha=hashlib.file_digest(stream,'sha256').hexdigest()
        docid='hf_'+digest('casey6:handbook:'+sha)[:24]
        pdf=fitz.open(p)
        level = 'foundation' if program=='FOUNDATION_YEAR' else ('master' if name.startswith('MSc') else 'bachelor')
        approval = 'candidate' if level=='foundation' else 'approved'
        flags=['handbook_2026_2027','demo_approved_not_institutionally_reviewed','do_not_project_historical_deadlines_forward']
        if level=='foundation':flags.append('institution_scope_needs_verification')
        files.append({'id':docid,'title':f'Handbook 2026–2027 — {title}', 'filename':name,
          'relative_pdf_path':name,'sha256':sha,'source_provenance':'H-FARM Student Office handbook shared 2026-10-26',
          'source_url':f'https://drive.google.com/file/d/{gid}/view',
          'source_pool':'CAFOSCARI' if pool=='CAFOSCARI' else 'CHICHESTER', 'applicable_pool':pool,
          'topic':'Handbook accademico e servizi campus','program':program,'audience':'students',
          'language':'en','academic_year':'2026/2027','validity_flags':flags,'effective_from':None,
          'review_by':None,'document_approval_date':None,'pdf_pages':len(pdf),
          'approval_status':approval,'verified_by':'student_requested_demo_import' if approval=='approved' else None,
          'verified_at':datetime.now(timezone.utc).isoformat() if approval=='approved' else None})
        for pg_i,page in enumerate(pdf):
            txt=clean(page.get_text('text',sort=True))
            page_hashes[digest(re.sub(r'\s+',' ',txt.casefold()))].append((name,pg_i+1))
            parts=split_page(txt)
            if not parts:
                zero.append({'file':name,'page':pg_i+1,'reason':'image/divider/low text; visual verification needed'})
            heading=next((s.strip()[:160] for s in txt.splitlines() if len(s.strip())>4),'Handbook')
            if level=='master' and pg_i+1==8:
                heading += ' | CAUTION: 40% mentioned for undergraduate levels L4-L6; master level 7 threshold is 50% (RESIT p11)'
            elif level=='master' and pg_i+1==9:
                heading += ' | PROVISIONAL PASS only for undergraduate L4, not MSc L7'
            elif level=='master' and pg_i+1==11:
                heading += ' | MASTER LEVEL 7 pass threshold 50%, voto minimo per superare un esame master 50%'
            if program=='DIGITAL_MANAGEMENT' and pg_i+1 in (14,15,49):
                heading += ' | NOTICE: calendar/deadlines specify 2026 only, not automatically validated for 2027'
            aliases=[]
            for pattern,italian in [
                (r'\bprinter|printing|print to|save_that_tree\b','stampa stampante stampare stampo'),
                (r'\bpronote|attendance|absences\b','presenze assenze frequenza'),
                (r'\binternship|internships\b','stage tirocinio'),
                (r'\bmitigating circumstances\b','giustificazioni circostanze attenuanti'),
                (r'\bstudent office\b','segreteria studenti'),
                (r'\bcareer service\b','ufficio carriere lavoro'),
                (r'\bmeal|canteen|restaurant|lunch\b','pranzo mensa ristorazione'),
                (r'\bexaminations|exam |exams |assessment|resit\b','esami valutazione recupero'),
                (r'\bacademic calendar|academic timeline\b','calendario accademico'),
                (r'\bcontacts?\b','contatti riferimento telefono'),
                (r'\bscholarship|bursar\b','borsa di studio'),
                (r'\binclusion office\b','inclusione disabilita'),
                (r'\blibrary\b','biblioteca'),
                (r'\btransport|shuttle|bus\b','trasporti navetta autobus'),
                (r'\bqualification|degree|dissertation|thesis\b','laurea tesi titolo'),
                (r'\bgrades?|marks?\b','voti votazione'),
            ]:
                if re.search(pattern,txt,re.I):aliases.append(italian)
            if aliases:heading += ' | SEARCH_IT: '+ ' '.join(aliases)
            for k,frag in enumerate(parts,1):
                contsha=digest(frag)
                chunkid='hc_'+digest('casey6:chunk:'+sha+':'+str(pg_i+1)+':'+str(k)+':'+contsha)[:24]
                if chunkid in used:raise ValueError('Chunk ID collision')
                used[chunkid]+=1
                rows.append({'id':chunkid,'doc_id':docid,'pdf_page':pg_i+1,'chunk_index_on_page':k,
                  'section_hint':heading,'content':frag,'content_sha256':contsha,
                  'word_count':len(re.findall(r'\b[\w’-]+\b',frag)),
                  'explicit_applicability':[],'scope_verified':False})
        pdf.close()
    return files,rows,zero,page_hashes

def request(base: str, key: str, table: str, rows: list[dict], timeout: int=60):
    body=json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    url=f'{base.rstrip("/")}/rest/v1/{table}?on_conflict=id'
    headers={'apikey':key,'Content-Type':'application/json',
             'Prefer':'resolution=ignore-duplicates,return=minimal'}
    if not key.startswith('sb_secret_'):
        headers['Authorization']=f'Bearer {key}'
    req=urllib.request.Request(url,data=body,headers=headers,method='POST')
    with urllib.request.urlopen(req,timeout=timeout) as res:
        return res.status

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',type=Path,default=Path('/mnt/data'))
    ap.add_argument('--output',type=Path,default=Path('casey6-handbook-rag'))
    ap.add_argument('--apply',action='store_true',help='Explicit opt-in to upload metadata and page excerpts to Supabase')
    ap.add_argument('--project',choices=['preview','production'],default='preview')
    args=ap.parse_args()
    docs,chunks,empty,page_hashes=build(args.root)
    args.output.mkdir(parents=True,exist_ok=True)
    for target,rs in [('documents.json',docs),('chunks.json',chunks),('needs_visual_review.json',empty)]:
        (args.output/target).write_text(json.dumps(rs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    bypool=Counter(d['applicable_pool'] for d in docs)
    manifest={'documents':len(docs),'chunks':len(chunks),'empty_page_candidates':len(empty),
              'unique_chunk_hashes':len(set(x['content_sha256'] for x in chunks)),
              'total_chunk_characters':sum(len(x['content']) for x in chunks),
              'source_pools':dict(bypool),'production_old_document_ids_are_not_modified':True,
              'embedding_generation':'NOT INCLUDED; lexical FTS works with existing hf8_search_hybrid',
              'scope_note':'Exact roster program required; Foundation is candidate until independently confirmed.'}
    (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))
    if not args.apply:print('DRY RUN: no Supabase writes');return
    expected={'preview':'https://sneaxpqnmlhnrhoautjx.supabase.co','production':'https://oxzraaadxqsruibinlxn.supabase.co'}[args.project]
    base=os.environ.get('SUPABASE_URL','').rstrip('/')
    key=os.environ.get('SUPABASE_SERVICE_ROLE_KEY','')
    if base!=expected:raise SystemExit(f'Safety guard: SUPABASE_URL must exactly match {expected}')
    if not key or len(key)<20:raise SystemExit('Missing SUPABASE_SERVICE_ROLE_KEY; never put this key in source code.')
    print('Uploading 14 program-scoped metadata records, preserving all old hf8 documents...')
    request(base,key,'hf8_source_documents',docs)
    for i in range(0,len(chunks),30):
        request(base,key,'hf8_source_chunks',chunks[i:i+30])
        print('uploaded chunks',min(i+30,len(chunks)),'/',len(chunks),flush=True)
    print('Import complete. IMPORTANT: run acceptance checks before enabling demo traffic.')
if __name__=='__main__':main()
