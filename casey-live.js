/* Casey Live 5.2.1 — Google Gemini Live, browser PCM microphone and streamed audio.
 * No Calendar/Gmail tool execution: use Casey Standard for verified actions.
 * The Gemini API key remains on Supabase. Never log the WebSocket URL or token.
 */
(() => {
  'use strict';

  const TOKEN_ENDPOINT = 'https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-live-token';
  const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=';
  const MAX_WS_BUFFERED_BYTES = 400_000;
  const SETUP_TIMEOUT_MS = 15_000;
  const encoder = new TextDecoder();
  const get = (id) => document.getElementById(id);

  let socket = null;
  let mediaStream = null;
  let audioContext = null;
  let mediaSource = null;
  let processor = null;
  let silentGain = null;
  let scheduled = new Set();
  let outputAt = 0;
  let started = false;
  let starting = false;
  let ready = false;
  let paused = false;
  let turnDone = false;
  let revision = 0;
  let setupTimer = null;
  let receiveChain = Promise.resolve();
  let elapsedStart = 0;
  let chunksSent = 0;

  function status(value) {
    const node = get('caseyLiveStatus');
    if (node) {
      node.textContent = value;
      node.title = value;
    }
  }
  function subtitle(value) {
    const node = get('subtitleBox');
    if (node) node.textContent = value;
  }
  function avatar(state) {
    try {
      if (typeof window.setAvatarState === 'function') window.setAvatarState(state);
    } catch (_) { /* visual state must not break audio */ }
  }
  function render() {
    const toggle = get('caseyLiveBtn');
    const pause = get('caseyLivePause');
    if (toggle) {
      toggle.textContent = started ? 'Termina Live' : starting ? 'Connessione...' : 'Avvia Live';
      toggle.disabled = starting;
    }
    if (pause) {
      pause.hidden = !started;
      pause.textContent = paused ? 'Riprendi ascolto' : 'Pausa';
    }
  }
  function sessionToken() {
    try {
      const obj = JSON.parse(sessionStorage.getItem('casey-original-ui-session') || 'null');
      return obj?.exp > Date.now() + 1000 && typeof obj.token === 'string' ? obj.token : null;
    } catch (_) { return null; }
  }
  function toBase64(data) {
    let result = '';
    for (let i = 0; i < data.length; i += 8192) {
      result += String.fromCharCode(...data.subarray(i, i + 8192));
    }
    return btoa(result);
  }
  function fromBase64(data) {
    const decoded = atob(data);
    const buffer = new Uint8Array(decoded.length);
    for (let i = 0; i < buffer.length; i++) buffer[i] = decoded.charCodeAt(i);
    return buffer;
  }
  function resamplePcm16(samples, sourceRate) {
    // Google expects raw, mono PCM signed 16-bit LE at 16 kHz.
    const rate = Number(sourceRate);
    if (!Number.isFinite(rate) || rate < 16000) throw new Error('Frequenza microfono non supportata');
    const count = Math.max(1, Math.floor(samples.length * 16000 / rate));
    const output = new Uint8Array(count * 2);
    const view = new DataView(output.buffer);
    const factor = rate / 16000;
    for (let i = 0; i < count; i++) {
      const position = i * factor;
      const left = Math.floor(position);
      const right = Math.min(samples.length - 1, left + 1);
      const alpha = position - left;
      const sample = Math.max(-1, Math.min(1, samples[left] * (1 - alpha) + samples[right] * alpha));
      view.setInt16(i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
    }
    return output;
  }
  function stopOutput() {
    for (const source of scheduled) {
      try { source.onended = null; source.stop(); } catch (_) {}
      try { source.disconnect(); } catch (_) {}
    }
    scheduled.clear();
    outputAt = 0;
  }
  function playPcm(base64Data, mimeType) {
    if (!started || paused || !audioContext) return;
    const bytes = fromBase64(base64Data);
    if (bytes.length < 2 || bytes.length % 2 !== 0) return;
    const rate = Number(/rate=(\d+)/i.exec(mimeType || '')?.[1] || 24000);
    if (rate < 8000 || rate > 96000) return;
    const pcm = new Float32Array(bytes.length / 2);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < pcm.length; i++) pcm[i] = view.getInt16(i * 2, true) / 32768;
    const buffer = audioContext.createBuffer(1, pcm.length, rate);
    buffer.copyToChannel(pcm, 0);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    const when = Math.max(audioContext.currentTime + 0.035, outputAt);
    outputAt = when + buffer.duration;
    source.onended = () => {
      scheduled.delete(source);
      try { source.disconnect(); } catch (_) {}
      if (started && !paused && scheduled.size === 0 && turnDone) {
        avatar('LISTEN');
        status('In ascolto');
      }
    };
    scheduled.add(source);
    source.start(when);
    turnDone = false;
    avatar('C');
    status('Casey parla');
  }

  async function unpackFrame(raw) {
    // WebSocket defaults to Blob for binary frames. Google sends JSON bytes.
    if (typeof raw === 'string') return JSON.parse(raw);
    if (raw instanceof ArrayBuffer) return JSON.parse(encoder.decode(raw));
    if (ArrayBuffer.isView(raw)) return JSON.parse(encoder.decode(raw));
    if (raw && typeof raw.text === 'function') return JSON.parse(await raw.text());
    throw new Error('Formato WebSocket non riconosciuto');
  }
  function readableGeminiError(error) {
    const message = String(error?.message || error || 'Errore sconosciuto');
    const statusCode = String(error?.code || '');
    if (/quota|resource_exhausted|free tier|billing|prepayment|credit/i.test(message + statusCode)) {
      return 'Gemini: quota o crediti non disponibili (controlla AI Studio)';
    }
    return 'Gemini: ' + message.slice(0, 140);
  }
  function readPacket(packet, mine) {
    if (mine !== revision || !started) return;
    if (packet.error) {
      const reason = readableGeminiError(packet.error);
      console.warn('Casey Live server rejected setup:', reason);
      void stop(reason);
      return;
    }
    if (packet.setupComplete) {
      ready = true;
      clearTimeout(setupTimer);
      setupTimer = null;
      status(paused ? 'Microfono in pausa' : 'In ascolto');
      avatar(paused ? 'A' : 'LISTEN');
      console.info('Casey Live: sessione pronta', {ms: Math.round(performance.now() - elapsedStart)});
      return;
    }
    if (packet.goAway) {
      status('Gemini: sessione in scadenza; termina e riavvia Live');
    }
    const content = packet.serverContent;
    if (!content) return;
    if (content.interrupted) {
      stopOutput();
      turnDone = false;
      avatar('LISTEN');
      status('In ascolto');
    }
    if (content.inputTranscription?.text) {
      status('Tu: ' + String(content.inputTranscription.text).slice(0,100));
    }
    if (content.outputTranscription?.text) subtitle(String(content.outputTranscription.text));
    for (const part of content.modelTurn?.parts || []) {
      if (part.inlineData?.data) playPcm(part.inlineData.data, part.inlineData.mimeType);
    }
    if (content.turnComplete) {
      turnDone = true;
      if (!scheduled.size && !paused) {
        status('In ascolto');
        avatar('LISTEN');
      }
    }
  }

  function sendMicChunk(event) {
    if (!started || !ready || paused || !socket || socket.readyState !== WebSocket.OPEN) return;
    if (socket.bufferedAmount > MAX_WS_BUFFERED_BYTES) return;
    const samples = event.inputBuffer.getChannelData(0);
    const bytes = resamplePcm16(samples, audioContext.sampleRate);
    socket.send(JSON.stringify({realtimeInput: {audio: {data: toBase64(bytes), mimeType: 'audio/pcm;rate=16000'}}}));
    chunksSent++;
  }

  async function stop(reason = 'Live disattivato') {
    ++revision;
    started = false; starting = false; ready = false; paused = false; turnDone = false;
    clearTimeout(setupTimer); setupTimer = null;
    const oldSocket = socket; socket = null;
    if (oldSocket) {
      oldSocket.onclose = null; oldSocket.onerror = null; oldSocket.onmessage = null;
      try { oldSocket.close(); } catch (_) {}
    }
    stopOutput();
    if (processor) { processor.onaudioprocess = null; try { processor.disconnect(); } catch (_) {} }
    if (mediaSource) { try { mediaSource.disconnect(); } catch (_) {} }
    if (silentGain) { try { silentGain.disconnect(); } catch (_) {} }
    processor = mediaSource = silentGain = null;
    for (const track of mediaStream?.getTracks() || []) track.stop();
    mediaStream = null;
    const oldContext = audioContext; audioContext = null;
    if (oldContext) try { await oldContext.close(); } catch (_) {}
    avatar('A');
    status(reason);
    render();
  }
  async function start() {
    if (started || starting) return;
    starting = true;
    const mine = ++revision;
    elapsedStart = performance.now();
    chunksSent = 0;
    render();
    status('Connessione Gemini...');
    try {
      const session = sessionToken();
      if (!session) throw new Error('Sessione Casey non disponibile: aggiorna la pagina.');
      const language = window.CaseyVoice?.getLanguage?.() || 'it-IT';
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-session-token': session},
        body: JSON.stringify({language}),
        signal: AbortSignal.timeout(12000)
      });
      const credentials = await response.json();
      if (!response.ok) throw new Error(credentials.error || 'Token Gemini HTTP ' + response.status);
      if (typeof credentials.token !== 'string' || !credentials.token || !credentials.model || !credentials.config) {
        throw new Error('Configurazione Gemini non valida');
      }
      if (mine !== revision) return;
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
        video: false
      });
      if (mine !== revision) { for (const track of mediaStream.getTracks()) track.stop(); return; }
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      if (mine !== revision) return;
      mediaSource = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(2048, 1, 1);
      silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      mediaSource.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);
      processor.onaudioprocess = sendMicChunk;

      socket = new WebSocket(LIVE_ENDPOINT + encodeURIComponent(credentials.token));
      socket.binaryType = 'arraybuffer'; // required: otherwise setupComplete is delivered as Blob
      socket.onopen = () => {
        if (mine !== revision) return;
        status('Attendo conferma Gemini...');
        try {
          socket.send(JSON.stringify({setup: {model: 'models/' + credentials.model, ...credentials.config}}));
        } catch (_) { void stop('Invio configurazione Gemini non riuscito'); }
      };
      receiveChain = Promise.resolve();
      socket.onmessage = (event) => {
        // Even when the browser ignores binaryType, process Blob frames in original order.
        receiveChain = receiveChain.then(async () => {
          if (mine !== revision) return;
          const packet = await unpackFrame(event.data);
          readPacket(packet, mine);
        }).catch((error) => {
          if (mine === revision) {
            console.warn('Casey Live: messaggio Gemini non leggibile:', String(error?.message || error).slice(0,120));
            void stop('Risposta Gemini non riconosciuta');
          }
        });
      };
      socket.onerror = () => {
        if (mine !== revision) return;
        status('Errore di connessione Gemini');
      };
      socket.onclose = (event) => {
        if (mine !== revision) return;
        const details = String(event.reason || '').slice(0,200);
        const reason = event.code === 1000
          ? 'Connessione Gemini terminata' // no error implied
          : 'Gemini WebSocket ' + event.code + (details ? ': ' + details : '');
        console.warn('Casey Live closed:', event.code, details.slice(0,150));
        void stop(reason);
      };
      started = true;
      starting = false;
      render();
      status('Inizializzazione audio...');
      setupTimer = setTimeout(() => {
        if (mine === revision && !ready) {
          console.warn('Casey Live: setupComplete non ricevuto entro', SETUP_TIMEOUT_MS, 'ms');
          void stop('Gemini non ha confermato la sessione (timeout)');
        }
      }, SETUP_TIMEOUT_MS);
    } catch (error) {
      if (mine !== revision) return;
      console.warn('Casey Live start failed:', String(error?.message || error).slice(0,160));
      await stop('Live non disponibile: ' + String(error?.message || 'errore').slice(0,130));
    }
  }
  function pause() {
    if (!started) return;
    paused = !paused;
    if (paused) stopOutput();
    // Temporary pause must NOT send audioStreamEnd, which marks the stream as finished.
    for (const track of mediaStream?.getAudioTracks() || []) track.enabled = !paused;
    status(paused ? 'Microfono in pausa' : ready ? 'In ascolto' : 'Inizializzazione audio...');
    avatar(paused ? 'A' : 'LISTEN');
    render();
  }
  function toggle() { return started ? stop() : start(); }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('pagehide', () => { if (started || starting) void stop(); });
  window.CaseyLive = Object.freeze({toggle, start, pause, stop, get active() {return started;}, get ready() {return ready;}});
})();
