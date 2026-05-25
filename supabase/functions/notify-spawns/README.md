# notify-spawns

Edge Function para revisar `boss_records` y enviar avisos a Discord.

Secrets requeridos en Supabase:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Supabase inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` en Edge Functions desplegadas.
