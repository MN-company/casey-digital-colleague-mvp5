// Public endpoint only. Never put service-role keys or API secrets here.
window.CASEY_CONFIG = Object.freeze({
  supabaseUrl: 'https://oxzraaadxqsruibinlxn.supabase.co',
  publishableKey: 'sb_publishable_bqoLyLZhYPQRDK8gl9lKiA_fKur8z6r',
  apiUrl: 'https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-handoff-ui',
  liveTokenUrl: 'https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-handoff-live',
  handoffUrl: 'https://oxzraaadxqsruibinlxn.supabase.co/functions/v1/casey-handoff',
  sessionStorageKey: (location.pathname.endsWith('/college.html')||new URLSearchParams(location.search).get('mobile')==='1')?'casey-handoff-v2-phone-session':'casey-handoff-v2-kiosk-session',
  authStorageKey: (location.pathname.endsWith('/college.html')||new URLSearchParams(location.search).get('mobile')==='1')?'casey-handoff-v2-phone-auth':'casey-handoff-v2-kiosk-auth',
  timezone: 'Europe/Rome',
  organization: 'H-FARM College'
});
