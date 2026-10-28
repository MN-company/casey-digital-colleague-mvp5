import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../app-connected.js',import.meta.url),'utf8');
function setup(fail=false,privateAction=false){const calls=[];const window={CaseyBeta:{turn:async message=>{calls.push(message);if(fail)throw Error('Limite di oggi');return {answer:'Risposta <sicura>',citations:[{title:'Handbook <AI>',page:11}],mode:privateAction?'account_required':'llm'};}}};vm.runInNewContext(code,{window});return {api:window.CaseyApp,calls};}
test('native app shares metered beta backend and escapes sources',async()=>{const {api,calls}=setup();const r=await api.answer('Pass mark?');assert.equal(calls[0],'Pass mark?');assert.match(r.html,/Handbook &lt;AI&gt; · p. 11/);assert.doesNotMatch(r.html,/<AI>/);});
test('private actions offer the protected College account',async()=>{const {api}=setup(false,true);const r=await api.answer('Prenota');assert.equal(r.acts[0].a,'private-chat');});
test('network and quota failures are explicit and offer email access',async()=>{const {api}=setup(true);const r=await api.answer('AI');assert.match(r.text,/Limite di oggi/);assert.equal(r.acts[0].a,'account');assert.doesNotMatch(r.html,/app-blu.html/);});
test('both native apps load beta identity before conversation and retain real account shell',()=>{for(const name of ['app-blu.html','app-rossa.html']){const s=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');assert.ok(s.indexOf('src="beta-client.js"')<s.indexOf('src="app-connected.js"'));assert.match(s,/CaseyApp.answer\(/);assert.match(s,/src="app-auth-shell.js"/);}});
