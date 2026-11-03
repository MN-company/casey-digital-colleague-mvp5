import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const origin='https://casey-digital-colleague-live-git-demo-casey-video-mnbrain.vercel.app';
const files=['supabase/functions/casey-definitivo-handoff/index.ts','supabase/functions/casey-definitivo-ui/index.ts','supabase/functions/casey-definitivo-live/index.ts','supabase/functions/casey-original-ui/index.js','supabase/functions/_shared/beta-access.ts'];
for(const file of files)test(`${file} allows the demo branch origin exactly once`,()=>{
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 assert.equal(source.split(`'${origin}'`).length-1,1);
});
