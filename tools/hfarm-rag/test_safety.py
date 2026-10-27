"""Synthetic source and mocked upload tests; no real PDFs or network needed."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import fitz
import ingest_handbooks as ingest


class ImportSafety(unittest.TestCase):
    def test_repeat_upload_never_overwrites_an_existing_approval(self):
        stored = {'hf_existing': {'id': 'hf_existing', 'approval_status': 'candidate'}}

        def post(req, timeout):
            self.assertEqual(req.method, 'POST')
            self.assertIn('resolution=ignore-duplicates', req.headers['Prefer'])
            for row in json.loads(req.data):
                if 'resolution=ignore-duplicates' in req.headers['Prefer']:
                    stored.setdefault(row['id'], row)
                else:
                    stored[row['id']] = row
            from contextlib import nullcontext
            from types import SimpleNamespace
            return nullcontext(SimpleNamespace(status=201))

        rows = [{'id': 'hf_existing', 'approval_status': 'approved'},
                {'id': 'hf_new', 'approval_status': 'candidate'}]
        with patch('urllib.request.urlopen', side_effect=post):
            for _ in range(2):
                ingest.request('https://example.invalid', 'sb_secret_test', 'hf8_source_documents', rows)
        self.assertEqual(stored['hf_existing']['approval_status'], 'candidate')
        self.assertEqual(len(stored), 2)

    def test_secret_key_is_not_sent_as_a_bearer_jwt(self):
        from contextlib import nullcontext
        from types import SimpleNamespace
        for key, bearer in [('sb_secret_test', False), ('legacy-test-jwt', True)]:
            with self.subTest(key_type='secret' if not bearer else 'legacy'):
                with patch('urllib.request.urlopen', return_value=nullcontext(SimpleNamespace(status=201))) as post:
                    ingest.request('https://example.invalid', key, 'hf8_source_documents', [])
                req = post.call_args.args[0]
                self.assertEqual('Authorization' in req.headers, bearer)

    def test_cli_dry_run_never_uploads_and_apply_rejects_wrong_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            # Clearly synthetic one-page files exercise scope/identity rules only.
            # They do not establish extraction quality for the original handbooks.
            for name, _, _, _, _ in ingest.DOCS:
                pdf = fitz.open()
                page = pdf.new_page()
                page.insert_text((72, 72), f'SYNTHETIC QA ONLY {name}\nUndergraduate 40%; Master 50%.')
                pdf.save(root / name)
                pdf.close()
            docs, chunks, _, _ = ingest.build(root)
            second_docs, second_chunks, _, _ = ingest.build(root)
            self.assertEqual([d['id'] for d in docs], [d['id'] for d in second_docs])
            self.assertEqual(chunks, second_chunks)
            self.assertEqual(len(docs), 14)
            self.assertEqual(sum(d['applicable_pool'] == 'CAFOSCARI' for d in docs), 1)
            foundation = next(d for d in docs if d['program'] == 'FOUNDATION_YEAR')
            self.assertEqual(foundation['approval_status'], 'candidate')
            self.assertTrue(all('do_not_project_historical_deadlines_forward' in d['validity_flags'] for d in docs))
            self.assertTrue(all(c['content_sha256'] == hashlib.sha256(c['content'].encode()).hexdigest() for c in chunks))
            command = [sys.executable, str(Path(ingest.__file__)), '--root', str(root), '--output', str(root / 'results')]
            with patch.object(sys, 'argv', command[1:]), patch.object(ingest, 'request') as upload:
                ingest.main()
                upload.assert_not_called()
            env = {**os.environ, 'SUPABASE_URL': 'https://wrong-project.invalid', 'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_synthetic_test_only'}
            result = subprocess.run(command + ['--apply', '--project', 'production'], env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Safety guard', result.stderr)


if __name__ == '__main__':
    unittest.main()
