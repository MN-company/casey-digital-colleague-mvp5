#!/usr/bin/env python3
"""Resume the service-only embedding job. Credentials stay in the environment."""
import argparse
import json
import os
import time
import urllib.request
import urllib.error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', choices=['preview', 'production'], required=True)
    parser.add_argument('--batch-size', type=int, default=60)
    parser.add_argument('--max-batches', type=int, default=100)
    args = parser.parse_args()
    expected = {'preview': 'https://sneaxpqnmlhnrhoautjx.supabase.co',
                'production': 'https://oxzraaadxqsruibinlxn.supabase.co'}[args.project]
    if os.environ.get('SUPABASE_URL', '').rstrip('/') != expected:
        raise SystemExit('SUPABASE_URL must match the explicitly selected project')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not key.startswith('eyJ'):
        raise SystemExit('A private legacy service_role JWT is required for the JWT-protected maintenance endpoint')
    for _ in range(args.max_batches):
        req = urllib.request.Request(expected + '/functions/v1/casey-rag-maintenance',
            data=json.dumps({'action': 'backfill', 'limit': max(1, min(100, args.batch_size))}).encode(),
            headers={'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key})
        try:
            with urllib.request.urlopen(req, timeout=100) as response:
                result = json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                print('Provider rate limit; waiting before resuming.', flush=True)
                time.sleep(55)
                continue
            raise SystemExit('Embedding maintenance rejected the request: HTTP ' + str(exc.code))
        print(json.dumps(result), flush=True)
        if result.get('complete'):
            return
        time.sleep(min(55, max(2, result.get('provider_texts', 0) * 0.9)))
    raise SystemExit('Batch limit reached; inspect progress and resume explicitly.')


if __name__ == '__main__':
    main()
