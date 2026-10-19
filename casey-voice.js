/* Casey Voice Manager v6 — native browser TTS for Standard mode.
 * Gemini Live generates its own audio, so no third-party TTS requests are needed.
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
    active = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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

  function browserSpeak(text, locale, done, id, onProgress) {
    if (id !== requestNumber) return;
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { onProgress?.(text); done(); return; }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const sentences = text.match(/[^.!?]+[.!?]*\s*|[.!?]+/g) || [text];
      let index=0, completed='';
      const next=()=>{
        if(id!==requestNumber)return;
        if(index>=sentences.length){done();return;}
        const sentence=sentences[index++];
        const utterance=new SpeechSynthesisUtterance(sentence);
        utterance.lang=locale;utterance.voice=preferredBrowserVoice(locale);
        utterance.rate=1;utterance.pitch=1;
        // Sentence cues also work with voices that never emit word boundaries.
        utterance.onstart=()=>{if(id===requestNumber)onProgress?.((completed+sentence).trim());};
        utterance.onend=()=>{if(id!==requestNumber)return;completed+=sentence;onProgress?.(completed.trim());next();};
        utterance.onerror=()=>{if(id!==requestNumber)return;onProgress?.(text);done();};
        synth.speak(utterance);
      };
      next();
    } catch (error) {
      console.warn('Casey: browser TTS unavailable:', error);
      done();
    }
  }

  function speak(rawText, onFinish, onProgress) {
    stop();
    const id = requestNumber;
    const text = String(rawText || '').trim();
    let finished = false;
    const done = () => {
      if (id !== requestNumber || finished) return;
      finished = true;
      active = null;
      if (typeof onFinish === 'function') onFinish();
    };
    if (!text) { done(); return; }
    active = {text};
    browserSpeak(text, language, done, id, onProgress);
  }

  window.CaseyVoice = Object.freeze({ setLanguage, getLanguage, speak, stop, supportedLanguages: LANGUAGES });
})();
