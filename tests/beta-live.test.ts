import {BETA_LIVE_CONFIG as config} from '../supabase/functions/_shared/beta-live-config.ts';
Deno.test('Live setup uses the Google BidiGenerateContent generationConfig envelope',()=>{
 if('responseModalities' in config||config.generationConfig.responseModalities[0]!=='AUDIO')throw Error('Invalid provider setup envelope');
 if(!config.inputAudioTranscription||!config.outputAudioTranscription)throw Error('Transcripts required');
});
Deno.test('Public Live setup exposes no booking, student record or arbitrary execution tools',()=>{
 const names=config.tools.flatMap(t=>t.functionDeclarations.map(f=>f.name)).sort();
 if(JSON.stringify(names)!==JSON.stringify(['handle_campus_request','request_mobile_handoff','search_verified_knowledge']))throw Error('Unexpected public tool');
});

Deno.test("Beta voice respects all supported languages with a safe default",async()=>{const {betaLiveConfig}=await import("../supabase/functions/_shared/beta-live-config.ts");for(const [code,expected] of [["it-IT","Italian"],["en-US","English"],["es-ES","Spanish"],["unknown","Italian"]]){if(!betaLiveConfig(code).systemInstruction.parts[0].text.includes("Reply only in "+expected+"."))throw Error("Wrong voice language");}});
