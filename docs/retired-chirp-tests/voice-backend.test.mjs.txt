import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount = JSON.stringify({
  type: 'service_account',
  client_email: 'casey-tts@unit-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  project_id: 'test-only'
});
const values = {
  GOOGLE_TTS_SERVICE_ACCOUNT_JSON: serviceAccount,
  SUPABASE_URL: 'https://sample.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-only-fake-key'
};
globalThis.Deno = { env: { get: name => values[name] } };
const { handleRequest } = await import('../supabase/functions/casey-tts/index.ts');
const token = 'b2d10fe8-45c7-40f1-a876-cdb1a4d5f6ad' + '96310a88-1947-4c4b-83c1-95f888bbbd60';
const HASH = createHash('sha256').update(token).digest('hex');
let captured = [];
let backendStatus = 200;
globalThis.fetch = async (target, options = {}) => {
  captured.push({ target: String(target), options });
  if (String(target).includes('/rest/v1/dc_sessions?')) {
    assert.match(String(target), new RegExp(HASH));
    return Response.json([{ id: 'session-id' }]);
  }
  if (String(target).includes('/rest/v1/rpc/dc_take_rate')) return Response.json(true);
  if (String(target) === 'https://oauth2.googleapis.com/token') {
    assert.match(options.body.toString(), /assertion=/);
    return Response.json({ access_token: 'mock-google-oauth-token', expires_in: 3600 });
  }
  if (String(target) === 'https://texttospeech.googleapis.com/v1/text:synthesize') {
    if (backendStatus !== 200) return Response.json({ error: 'mock unavailable' }, { status: backendStatus });
    assert.equal(options.headers.Authorization, 'Bearer mock-google-oauth-token');
    return Response.json({ audioContent: Buffer.from('fake-mp3-for-test').toString('base64') });
  }
  throw Error('Unknown fetch ' + target);
};
function req(body, headerToken = token, origin = 'https://casey-digital-colleague-live.vercel.app') {
  return new Request('https://sample.supabase.co/functions/v1/casey-tts', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'x-session-token': headerToken },
    body: JSON.stringify(body)
  });
}
test('Google TTS for Italian produces MP3 with no public credentials', async () => {
  captured = [];
  const res = await handleRequest(req({ text: 'Ciao Casey', language: 'it-IT' }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /audio\/mpeg/);
  assert.equal(await res.text(), 'fake-mp3-for-test');
  const tts = captured.find(x => x.target.includes('text:synthesize'));
  assert.equal(JSON.parse(tts.options.body).voice.name, 'it-IT-Chirp3-HD-Charon');
  assert.ok(!JSON.stringify(await res.headers).includes('private_key'));
});
test('English/Spanish map to allowed Chirp 3 voices', async () => {
  for (const lang of ['en-US', 'es-ES']) {
    captured = [];
    const res = await handleRequest(req({ text: 'Hello world', language: lang }));
    assert.equal(res.status, 200);
    const tts = captured.find(x => x.target.includes('text:synthesize'));
    assert.equal(JSON.parse(tts.options.body).voice.name, `${lang}-Chirp3-HD-Charon`);
  }
});
test('Unsupported language and oversize content blocked before spending quota', async () => {
  for (const body of [{ text: 'Hello', language: 'fr-FR' }, { text: 'x'.repeat(1250), language: 'it-IT' }]) {
    captured = [];
    const res = await handleRequest(req(body));
    assert.equal(res.status, 400);
    assert.equal(captured.length, 0);
  }
});
test('Invalid session blocked without TTS call', async () => {
  captured = [];
  const res = await handleRequest(req({ text: 'Hello', language: 'it-IT' }, 'invalid-session'));
  assert.equal(res.status, 401);
  assert.equal(captured.length, 0);
});
test('Cross-origin browser requests rejected', async () => {
  captured = [];
  const res = await handleRequest(req({ text: 'hello', language: 'it-IT' }, token, 'https://malicious.example'));
  assert.equal(res.status, 403);
  assert.equal(captured.length, 0);
});
test('Google temporary failure returns 502 (allows frontend browser fallback)', async () => {
  backendStatus = 503;
  const res = await handleRequest(req({ text: 'hello', language: 'it-IT' }));
  assert.equal(res.status, 502);
  assert.doesNotMatch(await res.text(), /private_key|fake-key|mock-google-oauth-token/);
  backendStatus = 200;
});
