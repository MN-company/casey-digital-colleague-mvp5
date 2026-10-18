import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../casey-voice.js', import.meta.url), 'utf8');
function createEnv({ status = 200, hasSession = true, delay = 0 } = {}) {
  const traces = { google: [], fallback: [], audio: [], abort: [], completed: 0 };
  const store = new Map([['CASEY_ELEVEN_KEY', 'retired-test-key']]);
  const synth = {
    cancel() {}, getVoices: () => [{ lang: 'it-IT', name: 'Google italiano' }, { lang: 'es-ES', name: 'Spanish Voice' }],
    speak(utterance) { traces.fallback.push(utterance); setTimeout(() => utterance.onend?.(), 0); }
  };
  class MockUtterance { constructor(text) { this.text = text; } }
  class MockAudio {
    constructor(src) { this.src = src; traces.audio.push(this); }
    async play() { setTimeout(() => this.onended?.(), 0); }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  const window = { speechSynthesis: synth, SpeechSynthesisUtterance: MockUtterance,
    CASEY_CONFIG: { ttsUrl: 'https://project.supabase.co/functions/v1/casey-tts' }
  };
  const sandbox = {
    window, SpeechSynthesisUtterance: MockUtterance, Audio: MockAudio, console: { warn() {} },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    localStorage: { getItem: k => store.get(k) || null, removeItem: k => store.delete(k), setItem: (k, v) => store.set(k, v) },
    sessionStorage: { getItem: () => hasSession ? JSON.stringify({ token: 'valid-token', exp: Date.now() + 100000 }) : null },
    AbortController, setTimeout, clearTimeout, Date,
    fetch: async (url, options) => {
      traces.google.push({ url, options });
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      return new Response(status === 200 ? new Blob(['MP3'], { type: 'audio/mpeg' }) : 'fail', {
        status, headers: { 'content-type': status === 200 ? 'audio/mpeg' : 'text/plain' }
      });
    },
    Response, Blob, Map, Object
  };
  vm.runInNewContext(source, sandbox, { filename: 'casey-voice.js' });
  return { api: window.CaseyVoice, traces, store };
}
async function wait() { await new Promise(r => setTimeout(r, 25)); }
test('Google Cloud is primary; previous ElevenLabs credential is erased', async () => {
  const { api, traces, store } = createEnv();
  await api.speak('Ciao Casey', () => traces.completed++);
  await wait();
  assert.equal(traces.google.length, 1);
  assert.equal(traces.fallback.length, 0);
  assert.equal(traces.audio.length, 1);
  assert.equal(traces.completed, 1);
  assert.equal(store.has('CASEY_ELEVEN_KEY'), false);
});
test('Google failure triggers native browser voice in same language', async () => {
  const { api, traces } = createEnv({ status: 503 });
  api.setLanguage('es-ES');
  await api.speak('Hola', () => traces.completed++);
  await wait();
  assert.equal(JSON.parse(traces.google[0].options.body).language, 'es-ES');
  assert.equal(traces.fallback[0].lang, 'es-ES');
  assert.equal(traces.completed, 1);
});
test('No backend session uses browser voice immediately', async () => {
  const { api, traces } = createEnv({ hasSession: false });
  await api.speak('Ciao', () => traces.completed++);
  await wait();
  assert.equal(traces.google.length, 0);
  assert.equal(traces.fallback[0].lang, 'it-IT');
  assert.equal(traces.completed, 1);
});
test('Only three languages can be selected', () => {
  const { api } = createEnv();
  assert.equal(api.setLanguage('de-DE'), false);
  assert.equal(api.setLanguage('fr-FR'), false);
  assert.equal(api.setLanguage('en-US'), true);
  assert.equal(api.getLanguage(), 'en-US');
});
test('Stop prevents an inflight response playing', async () => {
  const { api, traces } = createEnv({ delay: 10 });
  const pending = api.speak('Interruption test', () => traces.completed++);
  api.stop();
  await pending;
  await wait();
  assert.equal(traces.audio.length, 0);
  assert.equal(traces.completed, 0);
});
