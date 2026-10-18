/**
 * Casey MVP 5.1: Google Cloud Text-to-Speech adapter (Chirp 3 HD).
 * A valid Casey backend session is required, even with verify_jwt=false.
 * Secret GOOGLE_TTS_SERVICE_ACCOUNT_JSON must remain in Supabase Edge Function Secrets.
 * Uses Web Crypto + REST only; no npm runtime dependencies.
 */
const encoder = new TextEncoder();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || '';

const ORIGINS = new Set([
  'https://casey-digital-colleague-live.vercel.app',
  'https://pietrorizzatto8.github.io',
  'http://localhost:8000', 'http://127.0.0.1:8000',
  'http://localhost:4173', 'http://127.0.0.1:4173'
]);

const VOICES: Record<string, string> = Object.freeze({
  'it-IT': 'it-IT-Chirp3-HD-Charon',
  'en-US': 'en-US-Chirp3-HD-Charon',
  'es-ES': 'es-ES-Chirp3-HD-Charon'
});

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const OAUTH_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
let oauthCache: { token: string; expires: number } | null = null;

function cors(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://casey-digital-colleague-live.vercel.app',
    'Access-Control-Allow-Headers': 'content-type,x-session-token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}
function failure(message: string, status: number, origin: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function b64Url(source: Uint8Array): string {
  let binary = '';
  for (const x of source) binary += String.fromCharCode(x);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(input: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(input)));
  return [...digest].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function supabase(path: string, body?: unknown): Promise<any> {
  if (!SUPABASE_URL || !SECRET) throw new Error('Supabase credentials not configured');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: SECRET,
      ...(SECRET.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${SECRET}` }),
      'Content-Type': 'application/json'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(7000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return payload;
}

async function validateAndRateLimit(request: Request): Promise<void> {
  const session = request.headers.get('x-session-token') || '';
  // Existing original-ui issues two UUIDs concatenated: 72 characters.
  if (!/^[a-f0-9-]{72}$/i.test(session)) {
    throw Object.assign(new Error('Session required'), { status: 401 });
  }
  const query = new URLSearchParams({
    select: 'id',
    token_hash: 'eq.' + await sha256(session),
    expires_at: 'gt.' + new Date().toISOString(),
    limit: '1'
  });
  const sessions = await supabase('dc_sessions?' + query.toString());
  if (!sessions?.[0]?.id) throw Object.assign(new Error('Session expired'), { status: 401 });

  // Reuse the database's atomic limiter rather than per-isolate Map counters.
  // Distinct limits guard the per-session budget, origin IP and overall demo usage.
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const buckets: Array<[string, number]> = [
    ['casey-tts:session:' + sessions[0].id, 35],
    ['casey-tts:ip:' + await sha256(ip), 70],
    ['casey-tts:global', 400]
  ];
  for (const [p_bucket, p_limit] of buckets) {
    const accepted = await supabase('rpc/dc_take_rate', { p_bucket, p_limit });
    if (accepted !== true) throw Object.assign(new Error('Rate limit exceeded'), { status: 429 });
  }
}

function readServiceAccount(): { client_email: string; private_key: string; token_uri?: string } {
  const raw = Deno.env.get('GOOGLE_TTS_SERVICE_ACCOUNT_JSON') || '';
  if (!raw) throw Object.assign(new Error('TTS service is not configured'), { status: 503 });
  let credentials: any;
  try { credentials = JSON.parse(raw); } catch { throw new Error('TTS credentials malformed'); }
  if (credentials?.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
    throw new Error('TTS credentials invalid');
  }
  return credentials;
}

async function googleAccessToken(): Promise<string> {
  if (oauthCache && oauthCache.expires > Date.now() + 60000) return oauthCache.token;
  const credentials = readServiceAccount();
  const pkcs8 = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(pkcs8), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = b64Url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = b64Url(encoder.encode(JSON.stringify({
    iss: credentials.client_email,
    scope: CLOUD_SCOPE,
    aud: OAUTH_ENDPOINT,
    iat: now,
    exp: now + 3600
  })));
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(header + '.' + payload)));
  const assertion = `${header}.${payload}.${b64Url(signature)}`;
  const response = await fetch(OAUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(9000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Google OAuth error (${response.status})`);
  oauthCache = { token: data.access_token, expires: Date.now() + (Math.min(Number(data.expires_in) || 3600, 3600) * 1000) };
  return oauthCache.token;
}

function base64ToBytes(data: string): Uint8Array {
  const decoded = atob(data);
  return Uint8Array.from(decoded, c => c.charCodeAt(0));
}

export async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== 'POST') return failure('Method not allowed', 405, origin);
  if (origin && !ORIGINS.has(origin)) return failure('Origin not allowed', 403, origin);
  try {
    if (Number(request.headers.get('content-length') || 0) > 6000) return failure('Payload too large', 413, origin);
    const raw = await request.text();
    if (encoder.encode(raw).length > 6000) return failure('Payload too large', 413, origin);
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return failure('Invalid JSON', 400, origin); }
    const language = payload?.language;
    const text = payload?.text;
    if (!Object.prototype.hasOwnProperty.call(VOICES, language)) return failure('Unsupported language', 400, origin);
    if (typeof text !== 'string' || text.trim().length < 1 || text.length > 1200 || encoder.encode(text).length > 4000) {
      return failure('Text must be 1–1200 characters, max 4000 UTF-8 bytes', 400, origin);
    }
    await validateAndRateLimit(request);
    const bearer = await googleAccessToken();
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.trim() },
        voice: { languageCode: language, name: VOICES[language] },
        audioConfig: { audioEncoding: 'MP3' }
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      // Do not leak Google response bodies or token information to the browser.
      console.error('Google Cloud TTS HTTP status:', response.status);
      return failure('Voice service unavailable', 502, origin);
    }
    const data = await response.json().catch(() => ({}));
    if (typeof data.audioContent !== 'string' || !data.audioContent) return failure('Empty voice result', 502, origin);
    const audio = base64ToBytes(data.audioContent);
    if (!audio.length) return failure('Empty voice result', 502, origin);
    return new Response(audio, {
      status: 200,
      headers: { ...cors(origin), 'Content-Type': 'audio/mpeg', 'Content-Length': String(audio.length) }
    });
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 503;
    console.error('Casey TTS error:', error instanceof Error ? error.message : String(error));
    return failure(status === 429 ? 'Voice request limit reached' : status === 401 ? 'Valid session required' : 'Voice service unavailable', status, origin);
  }
}

if (import.meta.main) Deno.serve(handleRequest);
