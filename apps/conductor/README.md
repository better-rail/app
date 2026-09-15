# The Conductor

Discord bot that assigns `ios` or `android` roles from welcome buttons.

1. Fill `.env` from `.env.example` and run `bun run setup`.
2. Copy `platformRoles` from `.conductor-setup.json` to `DISCORD_PLATFORM_ROLES`.
3. Deploy on Railway with root `apps/conductor` and config
   `/apps/conductor/railway.json`. Point Discord's Interactions Endpoint URL at
   `/discord/interactions`.

Test: `bun test && bun run check`. Keep Sentry tracing off; URLs hold tokens.
