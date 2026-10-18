/* Casey Voice Manager v5.1 — Google Cloud TTS first, Web Speech API fallback.
 * Runs in the browser, uses only a public endpoint and the existing demo session.
 * No Google Cloud or third-party API keys may ever be placed here.
 */
(function () {
  'use strict';
  const LANGUAGES = Object.freeze(['it-IT', 'en-US', 'es-ES']);
  const STORAGE_KEY = 'casey-voice-language';
  let language = 'it-IT';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) language = saved;
    // Retire the old ElevenLabs key previously stored by MVP 5.
    localStorage.removeItem('CASEY_ELEVEN_KEY');
  } catch (_) { /* Private browsing can disable storage. */ }

  let active = null;
  let requestNumber = 0;

  function setLanguage(value) {
    if (!LANGUAGES.includes(value)) return false;
    language = value;
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    return true;
  }
  function getLanguage() { return language; }

  function stop() {
    requestNumber++;
    if (active?.controller) active.controller.abort();
    if (active?.audio) {
      active.audio.onended = null;
      active.audio.onerror = null;
      active.audio.pause();
      active.audio.removeAttribute('src');
      active.audio.load();
    }
    if (active?.url) URL.revokeObjectURL(active.url);
    active = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function sessionToken() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('casey-original-ui-session') || 'null');
      if (saved?.token && saved.exp > Date.now()) return saved.token;
    } catch (_) {}
    return null;
  }

  function preferredBrowserVoice(locale) {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()));
    if (!voices.length) return null;
    const ranking = v => {
      const n = v.name.toLowerCase();
      return (v.lang.toLowerCase() === locale.toLowerCase() ? 15 : 0) +
        (/(natural|premium|enhanced|neural)/.test(n) ? 20 : 0) +
        (/(google|microsoft|siri)/.test(n) ? 5 : 0);
    };
    return voices.sort((a, b) => ranking(b) - ranking(a))[0];
  }

  function browserSpeak(text, locale, done, id) {
    if (id !== requestNumber) return;
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { done(); return; }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.voice = preferredBrowserVoice(locale);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = done;
      utterance.onerror = done;
      synth.speak(utterance);
    } catch (error) {
      console.warn('Casey: browser TTS unavailable:', error);
      done();
    }
  }

  async function speak(rawText, onFinish) {
    stop();
    const id = requestNumber;
    const locale = language;
    const text = String(rawText || '').trim();
    let finished = false;
    const done = () => {
      if (finished || id !== requestNumber) return;
      finished = true;
      if (active?.url) URL.revokeObjectURL(active.url);
      active = null;
      if (typeof onFinish === 'function') onFinish();
    };
    if (!text) { done(); return; }
    const controller = new AbortController();
    active = { controller, audio: null, url: null };
    const fallback = () => browserSpeak(text, locale, done, id);
    const token = sessionToken();
    const url = window.CASEY_CONFIG?.ttsUrl;
    if (!token || !url) { fallback(); return; }

    // Google synthesis has a bounded wait: failure always moves to the local TTS.
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': token },
        body: JSON.stringify({ text, language: locale }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Google TTS HTTP ' + response.status);
      if (!(response.headers.get('content-type') || '').includes('audio/mpeg')) throw new Error('Unexpected TTS content type');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty Google TTS output');
      if (id !== requestNumber) return;
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      active = { controller, audio, url: objectUrl };
      audio.onended = done;
      audio.onerror = () => {
        if (id !== requestNumber) return;
        URL.revokeObjectURL(objectUrl);
        active = { controller, audio: null, url: null };
        fallback();
      };
      try { await audio.play(); }
      catch (error) {
        if (id === requestNumber) {
          URL.revokeObjectURL(objectUrl);
          active = { controller, audio: null, url: null };
          throw error;
        }
      }
    } catch (error) {
      if (id === requestNumber) {
        console.warn('Casey: Google Cloud voice unavailable; using browser voice:', error.message);
        fallback();
      }
    } finally {
      clearTimeout(timer);
    }
  }

  window.CaseyVoice = Object.freeze({ setLanguage, getLanguage, speak, stop, supportedLanguages: LANGUAGES });
})();
