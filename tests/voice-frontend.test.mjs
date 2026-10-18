import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../casey-voice.js',import.meta.url),'utf8');
function env(){
 const speech=[];let stopCount=0;
 const cache=new Map();
 class Utterance{constructor(s){this.text=s;}}
 const speechSynthesis={cancel(){stopCount++},getVoices(){return [{lang:'it-IT',name:'Italiano Neural'},{lang:'en-US',name:'English'}]},speak(item){speech.push(item);setTimeout(()=>item.onend?.(),0)}};
 const window={speechSynthesis,SpeechSynthesisUtterance:Utterance};
 let requests=0;
 vm.runInNewContext(source,{window,SpeechSynthesisUtterance:Utterance,localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)},fetch(){requests++;throw Error('TTS should not call API');},console,setTimeout,clearTimeout});
 return {window,speech,cache,get requests(){return requests},get stopCount(){return stopCount}};
}
test('Native browser TTS speaks Italian without Chirp endpoint or API key',async()=>{
 const e=env();let done=0;e.window.CaseyVoice.speak('Ciao',()=>done++);
 await new Promise(r=>setTimeout(r,10));
 assert.equal(e.requests,0);assert.equal(e.speech[0].text,'Ciao');assert.equal(e.speech[0].lang,'it-IT');assert.equal(done,1);
});
test('Language selector retains IT/EN/ES, no other locale',()=>{
 const e=env(),api=e.window.CaseyVoice;
 assert.equal(api.setLanguage('es-ES'),true);assert.equal(api.getLanguage(),'es-ES');
 assert.equal(api.setLanguage('fr-FR'),false);
});
test('Stopping TTS cancels queued utterance',()=>{
 const e=env(),api=e.window.CaseyVoice;
 api.speak('Test');const old=e.stopCount;api.stop();assert.equal(e.stopCount,old+1);
});
