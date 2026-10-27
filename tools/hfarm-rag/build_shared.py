"""Derive only verbatim-identical practical campus pages from DM and AI handbooks.
Source citations point to the AI PDF physical page; DM page is cross-verified.
"""
import importlib.util,json,fitz,hashlib,re,os,argparse
from pathlib import Path
spec=importlib.util.spec_from_file_location('ingest_handbooks',Path(__file__).parent/'ingest_handbooks.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
parser=argparse.ArgumentParser(description='Derive campus pages independently verified in two original PDF handbooks')
parser.add_argument('--root',default=os.environ.get('HANDBOOK_PDF_ROOT','/mnt/data'))
parser.add_argument('--output',default=None)
args=parser.parse_args()
root=Path(args.root);output=Path(args.output) if args.output else root
output.mkdir(parents=True,exist_ok=True)
ai=fitz.open(root/'BSc - AI.pdf');dm=fitz.open(root/'BSc - DM.pdf')
normalized=lambda s: re.sub(r'\s+',' ',s.lower().strip())
dmpages={m.digest(normalized(p.get_text('text',sort=True))):(i+1,p.get_text('text',sort=True)) for i,p in enumerate(dm)}
whitelist=[21,24,25,29,32,33,34,36,37,38,40,41,42,43,46,47,49,51]
valid=[]
for pagenum in whitelist:
 text=ai[pagenum-1].get_text('text',sort=True)
 h=m.digest(normalized(text));assert h in dmpages,(pagenum,'not in DM')
 valid.append((pagenum,dmpages[h][0],m.clean(text)))
synthsha=m.digest('2026/2027|dual-verified-shared|'+''.join(str(i)+':'+m.digest(t) for i,j,t in valid))
docid='hf_'+m.digest('casey6:shared-handbook:'+synthsha)[:24]
doc={'id':docid,'title':'Handbook H-FARM 2026–2027 — servizi campus comuni verificati in DM e AI',
'filename':'Casey_shared_handbook_derived_DM_AI_2026-27.json','relative_pdf_path':'Derived: BSc - AI.pdf p21–51 and BSc - DM.pdf corresponding pages',
'sha256':synthsha,'source_provenance':'H-FARM Student Office shared handbook pages verified identically in AI and DM 2026-10-26',
'source_url':'https://drive.google.com/file/d/1PKfzwnIuSmRWCRwPC_JPW6PmN8Kshbkj/view','source_pool':'GENERIC',
'applicable_pool':'SHARED','topic':'Campus services and common practical procedures','program':None,
'audience':'students','language':'en','academic_year':'2026/2027',
'validity_flags':['derived_from_verbatim_identical_pdfs_DM_AI','demo_approved_not_institutionally_reviewed','do_not_project_historical_deadlines_forward'],
'effective_from':None,'review_by':None,'document_approval_date':None,'pdf_pages':len(ai),'approval_status':'candidate','verified_by':None,'verified_at':None}
rows=[]
for ai_pg,dm_pg,text in valid:
 for j,frag in enumerate(m.split_page(text),1):
  h=m.digest(frag)
  rows.append({'id':'hc_'+m.digest('casey6:shared:'+synthsha+':'+str(ai_pg)+':'+str(j)+':'+h)[:24],
   'doc_id':docid,'pdf_page':ai_pg,'chunk_index_on_page':j,
   'section_hint':f'{next((s for s in text.splitlines() if len(s.strip())>3),"Handbook").strip()[:160]} | SAME TEXT: BSc AI p{ai_pg}, BSc Digital Management p{dm_pg}',
   'content':frag,'content_sha256':h,'word_count':len(re.findall(r'\b[\w’-]+\b',frag)),
   'explicit_applicability':['CAFOSCARI','CICC'],'scope_verified':True})
(output/'CASEY6_RAG_SHARED_DOCUMENT.md').write_text('# Derived shared document: JSON\n'+json.dumps([doc],ensure_ascii=False,separators=(',',':'))+'\n')
(output/'CASEY6_RAG_SHARED_CHUNKS.md').write_text('# Derived shared chunks: JSON\n'+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
print('pages',len(valid),'chunks',len(rows),'source_pages',[(i,j) for i,j,_ in valid], 'sha',synthsha)
