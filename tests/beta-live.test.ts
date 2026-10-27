import {BETA_LIVE_CONFIG as config} from '../supabase/functions/_shared/beta-live-config.ts';
Deno.test('Live setup uses the Google BidiGenerateContent generationConfig envelope',()=>{
 if('responseModalities' in config||config.generationConfig.responseModalities[0]!=='AUDIO')throw Error('Invalid provider setup envelope');
 if(!config.inputAudioTranscription||!config.outputAudioTranscription)throw Error('Transcripts required');
});
Deno.test('Public Live setup exposes no booking, student record or arbitrary execution tools',()=>{
 const names=config.tools.flatMap(t=>t.functionDeclarations.map(f=>f.name)).sort();
 if(JSON.stringify(names)!==JSON.stringify(['request_mobile_handoff','search_verified_knowledge']))throw Error('Unexpected public tool');
});
