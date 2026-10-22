import {test} from 'node:test';import assert from 'node:assert/strict';import '../casey-chat-merge.js';
const t=(id,text)=>({id,role:'user',text});
test('Concurrent devices keep both appended turns without replaying an acknowledged turn',()=>{const base=[t('a','inizio')],local=[...base,t('b','telefono')],remote=[...base,t('c','computer')];assert.deepEqual(CaseyChatMerge.merge(base,local,remote).map(t=>t.id),['a','c','b']);assert.deepEqual(CaseyChatMerge.merge(base,local,local),local);});
test('Conflicting history edits cannot silently erase another device',()=>{assert.throws(()=>CaseyChatMerge.merge([t('a','originale')],[t('a','edit')],[t('a','originale')]),/cronologia/);});
