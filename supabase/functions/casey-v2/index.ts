// Retired API: deliberately no imports, database calls, credentials or provider access.
Deno.serve(() => new Response(JSON.stringify({error:'Endpoint ritirato. Usa l’app Casey aggiornata.',code:'endpoint_retired'}),{status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}}));
