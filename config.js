// Public endpoint only. Never put service-role keys or API secrets here.
window.CASEY_CONFIG = Object.freeze({
  supabaseUrl: 'https://sneaxpqnmlhnrhoautjx.supabase.co',
  publishableKey: 'sb_publishable_ihmctxeXcVW3N_kMHo0Myg_Em5AIqVa',
  apiUrl: 'https://sneaxpqnmlhnrhoautjx.supabase.co/functions/v1/casey-handoff-ui',
  liveTokenUrl: 'https://sneaxpqnmlhnrhoautjx.supabase.co/functions/v1/casey-handoff-live',
  handoffUrl: 'https://sneaxpqnmlhnrhoautjx.supabase.co/functions/v1/casey-handoff',
  sessionStorageKey: new URLSearchParams(location.search).get('mobile')==='1'?'casey-handoff-phone-session':'casey-handoff-kiosk-session',
  authStorageKey: new URLSearchParams(location.search).get('mobile')==='1'?'casey-handoff-phone-auth':'casey-handoff-kiosk-auth',
  timezone: 'Europe/Rome',
  organization: 'H-FARM College'
});
