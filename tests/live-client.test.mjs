import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const client = readFileSync(new URL('../casey-live.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function setup({ httpStatus = 200, serverToken = 'token-example', autoEnd=true } = {}) {
  const elems = new Map();
  function el(id) {
    if (!elems.has(id)) elems.set(id, {textContent: '', title: '', hidden: false, disabled: false});
    return elems.get(id);
  }
  const instances = [];
  const frames = [];
  const tracks = [{enabled: true, stop() {this.stopped = true;}}];
  let processor;
  const sources=[],avatars=[],dialogue=[],events=[];
  const context = {
    sampleRate: 48000, currentTime: 1, destination: {},
    resume: async () => {}, close: async () => {},
    createMediaStreamSource: () => ({connect() {}, disconnect() {}}),
    createScriptProcessor: () => (processor = {connect() {}, disconnect() {}, onaudioprocess: null}),
    createGain: () => ({gain:{value: 1}, connect() {}, disconnect() {}}),
    createBuffer: (_ch, samples, rate) => ({duration: samples/rate, copyToChannel() {}}),
    createBufferSource: () => {const source={connect() {}, disconnect() {}, start(when) {this.when=when;if(autoEnd)this.onended?.();}, stop() {}};sources.push(source);return source;}
  };
  class WebSocket {
    static OPEN = 1;
    constructor(url) {this.url = url; this.readyState = 1; this.bufferedAmount = 0; instances.push(this);}
    send(value) {frames.push(JSON.parse(value));}
    close() {this.readyState = 3;}
  }
  const listeners={};
  const window = {dispatchEvent(e){events.push(e);},CaseyDialogue:{append:(role,text)=>dialogue.push({role,text}),snapshot:()=>[]},setAvatarState:s=>avatars.push(s),WebSocket, AudioContext: class {constructor(){return context;}}, CaseyVoice:{getLanguage:()=> 'it-IT'}, CaseyTools:{execute:async(name,args)=>({status:'ok',tool:name,args})}, addEventListener(name,handler) {listeners[name]=handler;}};
  const globals = {
    window, WebSocket, navigator:{mediaDevices:{getUserMedia: async () => ({getTracks:()=>tracks, getAudioTracks:()=>tracks})}},
    sessionStorage:{getItem:()=>JSON.stringify({token:'session-token', exp:Date.now()+90000})},
    document:{getElementById:el, addEventListener() {}},
    fetch:async()=>({ok:httpStatus===200, status:httpStatus, json:async()=>httpStatus===200?{token:serverToken, model:'gemini-3.8-live', config:{generationConfig:{responseModalities:['AUDIO']}}}:{error:'Forbidden'}}),
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}},
    AbortSignal, Blob, ArrayBuffer, DataView, Float32Array, Uint8Array, TextDecoder, console, performance,
    btoa, atob, setTimeout, clearTimeout
  };
  vm.runInNewContext(client, globals, {filename:'casey-live.js'});
  return {window, context, sources, avatars, dialogue, events, listeners, elems, el, frames, tracks, instances, get processor(){return processor;}};
}

test('WebSocket binary ArrayBuffer setupComplete enables 16kHz PCM microphone streaming', async() => {
  const env=setup();
  await env.window.CaseyLive.start();
  const ws=env.instances[0];
  assert.equal(ws.binaryType,'arraybuffer');
  assert.equal(env.el('caseyLiveStatus').textContent,'Inizializzazione audio...');
  ws.onopen();
  assert.equal(env.frames[0].setup.model,'models/gemini-3.8-live');
  ws.onmessage({data:new TextEncoder().encode(JSON.stringify({setupComplete:{}})).buffer});
  await tick();
  assert.equal(env.window.CaseyLive.ready,true);
  assert.equal(env.el('caseyLiveStatus').textContent,'In ascolto');
  env.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048).fill(0.2)}});
  assert.equal(env.frames.length,2);
  assert.equal(env.frames[1].realtimeInput.audio.mimeType,'audio/pcm;rate=16000');
  assert.equal(atob(env.frames[1].realtimeInput.audio.data).length,1364);
  await env.window.CaseyLive.stop();
  assert.equal(env.tracks[0].stopped,true);
});

test('also handles Gemini setupComplete sent as Blob with original message ordering', async()=>{
  const env=setup();
  await env.window.CaseyLive.start();
  const ws=env.instances[0];
  ws.onmessage({data:new Blob([JSON.stringify({setupComplete:{}})])});
  await tick();
  assert.equal(env.window.CaseyLive.ready,true);
  await env.window.CaseyLive.stop();
});

test('pausing microphone preserves stream and resumes without audioStreamEnd', async()=>{
  const env=setup();
  await env.window.CaseyLive.start();
  const ws=env.instances[0];
  ws.onmessage({data:JSON.stringify({setupComplete:{}})});
  await tick();
  env.window.CaseyLive.pause();
  assert.equal(env.tracks[0].enabled,false);
  const previous=env.frames.length;
  env.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(2048)}});
  assert.equal(env.frames.length,previous);
  assert.equal(env.frames.filter(x=>x.realtimeInput?.audioStreamEnd).length,0);
  env.window.CaseyLive.pause();
  assert.equal(env.tracks[0].enabled,true);
  await env.window.CaseyLive.stop();
});

test('close event reports reason and cleans up rather than hanging on initialization', async()=>{
  const env=setup();
  await env.window.CaseyLive.start();
  env.instances[0].onclose({code:1008,reason:'session exhausted'});
  await tick();
  assert.equal(env.window.CaseyLive.active,false);
  assert.match(env.el('caseyLiveStatus').textContent,/1008/);
});

test('upstream failure surfaces readable error without opening microphone', async()=>{
  const env=setup({httpStatus:403});
  await env.window.CaseyLive.start();
  assert.equal(env.instances.length,0);
  assert.match(env.el('caseyLiveStatus').textContent,/Forbidden/);
});

test('Gemini server error is displayed and voice session stops', async()=>{
  const env=setup();
  await env.window.CaseyLive.start();
  env.instances[0].onmessage({data:JSON.stringify({error:{code:429,message:'RESOURCE_EXHAUSTED: API quota reached'}})});
  await tick();
  assert.equal(env.window.CaseyLive.active,false);
  assert.match(env.el('caseyLiveStatus').textContent,/quota/i);
});


test('Gemini toolCall is routed through CaseyTools and returns the matching function ID',async()=>{
  const env=setup();await env.window.CaseyLive.start();const ws=env.instances[0];
  ws.onmessage({data:JSON.stringify({setupComplete:{}})});await tick();
  ws.onmessage({data:JSON.stringify({toolCall:{functionCalls:[{name:'find_available_slots',id:'tool-42',args:{day:'2026-10-21'}}]}})});
  await tick();await tick();
  const res=env.frames.find(f=>f.toolResponse);
  assert.equal(res.toolResponse.functionResponses[0].id,'tool-42');
  assert.equal(res.toolResponse.functionResponses[0].response.result.tool,'find_available_slots');
  await env.window.CaseyLive.stop();
});
test('Backend-verified booking result is reported to Gemini only after button workflow event',async()=>{
  const env=setup();await env.window.CaseyLive.start();const ws=env.instances[0];
  ws.onmessage({data:JSON.stringify({setupComplete:{}})});await tick();
  assert.equal(env.frames.filter(f=>f.clientContent).length,0);
  env.listeners['casey:booking-result']({detail:{status:'confirmed',google_sync:'created'}});
  const messages=env.frames.filter(f=>f.clientContent);
  assert.equal(messages.length,1);
  assert.match(messages[0].clientContent.turns[0].parts[0].text,/verified and created/);
  await env.window.CaseyLive.stop();
});

test('typed Live input uses the same socket and marks the user turn',async()=>{
 const e=setup();await e.window.CaseyLive.start();const ws=e.instances[0];
 assert.equal(e.window.CaseyLive.sendText('Not ready'),false);
 ws.onmessage({data:JSON.stringify({setupComplete:{}})});await tick();
 assert.equal(e.window.CaseyLive.sendText('Ricorda martedì'),true);
 assert.equal(e.frames.at(-1).clientContent.turns[0].parts[0].text,'Ricorda martedì');
 assert.equal(e.dialogue.at(-1).role,'user');await e.window.CaseyLive.stop();
});
test('Live transcript fragments accumulate, finish on audio end, and reset for next turn',async()=>{
 const e=setup({autoEnd:false});await e.window.CaseyLive.start();const ws=e.instances[0];
 ws.onmessage({data:JSON.stringify({setupComplete:{}})});await tick();
 for(const text of ['Ciao ', 'come stai?'])ws.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text},modelTurn:{parts:[{inlineData:{data:btoa('\0\0'.repeat(2400)),mimeType:'audio/pcm;rate=24000'}}]}}})});
 ws.onmessage({data:JSON.stringify({serverContent:{turnComplete:true}})});await tick();
 for(const source of e.sources)source.onended();
 assert.equal(e.el('subtitleBox').textContent,'Ciao come stai?');
 assert.equal(e.dialogue.at(-1).text,'Ciao come stai?');
 ws.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text:'Seconda frase.'},turnComplete:true}})});await tick();
 assert.equal(e.el('subtitleBox').textContent,'Seconda frase.');
 await e.window.CaseyLive.stop();
});
test('congested socket drops input with visible feedback',async()=>{
 const e=setup();await e.window.CaseyLive.start();const ws=e.instances[0];ws.onmessage({data:JSON.stringify({setupComplete:{}})});await tick();
 ws.bufferedAmount=33000;const before=e.frames.length;e.processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(1024)}});
 assert.equal(e.frames.length,before);assert.match(e.el('caseyLiveStatus').textContent,/Rete lenta/);await e.window.CaseyLive.stop();
});
