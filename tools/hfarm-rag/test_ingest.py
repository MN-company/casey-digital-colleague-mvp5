import importlib.util,hashlib,json,unittest,os
from pathlib import Path
spec=importlib.util.spec_from_file_location('ingest_handbooks', Path(__file__).parent/'ingest_handbooks.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class IngestAudit(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.docs,cls.chunks,cls.empty,cls.hashes=m.build(Path(os.environ.get('HANDBOOK_PDF_ROOT','/mnt/data')))
 def test_all_14_real(self):
  self.assertEqual(len(self.docs),14)
  self.assertEqual({d['filename'] for d in self.docs},{d[0] for d in m.DOCS})
 def test_stable_unique_ids(self):
  self.assertEqual(len({d['id'] for d in self.docs}),14)
  self.assertEqual(len({c['id'] for c in self.chunks}),len(self.chunks))
  self.assertTrue(all(d['id'].startswith('hf_') for d in self.docs))
 def test_source_sha_real(self):
  for d in self.docs:
   with open(str(Path(os.environ.get('HANDBOOK_PDF_ROOT','/mnt/data'))/d['filename']),'rb') as f:self.assertEqual(d['sha256'],hashlib.file_digest(f,'sha256').hexdigest())
 def test_page_anchors(self):
  docmap={d['id']:d for d in self.docs}
  self.assertTrue(all(1<=c['pdf_page']<=docmap[c['doc_id']]['pdf_pages'] for c in self.chunks))
  self.assertTrue(all(len(c['content'])>20 and c['word_count']>0 for c in self.chunks))
 def test_scope(self):
  dm=[d for d in self.docs if d['filename']=='BSc - DM.pdf'][0]
  self.assertEqual((dm['applicable_pool'],dm['program']),('CAFOSCARI','DIGITAL_MANAGEMENT'))
  self.assertEqual(len([d for d in self.docs if d['applicable_pool']=='CAFOSCARI']),1)
  self.assertTrue(all(d['academic_year']=='2026/2027' for d in self.docs))
  self.assertEqual(next(d for d in self.docs if d['program']=='FOUNDATION_YEAR')['approval_status'],'candidate')
 def test_level_thresholds_remain_sourced(self):
  ms=[c for c in self.chunks if next(d for d in self.docs if d['id']==c['doc_id'])['filename'].startswith('MSc')]
  bs=[c for c in self.chunks if next(d for d in self.docs if d['id']==c['doc_id'])['filename'].startswith('BSc')]
  self.assertTrue(any('50%' in c['content'] for c in ms))
  self.assertTrue(any('40%' in c['content'] for c in bs))
 def test_no_source_name_collision(self):
  self.assertEqual(len({d['sha256'] for d in self.docs}),14)
 def test_dedup_strategy_does_not_drop_references(self):
  self.assertLess(len({c['content_sha256'] for c in self.chunks}),len(self.chunks))
  self.assertTrue(all(c['explicit_applicability']==[] for c in self.chunks))
 def test_no_2027_deadline_projection(self):
  self.assertTrue(all('do_not_project_historical_deadlines_forward' in d['validity_flags'] for d in self.docs))
 def test_idempotent(self):
  ds,cs,_,_=m.build(Path(os.environ.get('HANDBOOK_PDF_ROOT','/mnt/data')))
  self.assertEqual([x['id'] for x in ds],[x['id'] for x in self.docs])
  self.assertEqual([x['id'] for x in cs],[x['id'] for x in self.chunks])
if __name__=='__main__':unittest.main()
