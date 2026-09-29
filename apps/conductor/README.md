# The Conductor

Discord bot that handles:
1. Community onboarding: assigns `ios` or `android` roles from welcome buttons.
2. Email feedback bridge: routes incoming customer emails to `#email-feedback` Discord threads and sends outbound replies via `/reply` through Resend.

## Setup

1. Fill `.env` from `.env.example` and run `bun run setup` (provisions flair roles, posts welcome picker, and registers `/reply` command).
2. Copy `platformRoles` from `.conductor-setup.json` to `DISCORD_PLATFORM_ROLES`.
3. Set the Interactions Endpoint URL in the Discord Developer Portal to `https://<conductor-host>/discord/interactions` so `/reply` reaches the bot.
4. Set Resend inbound webhook in the Resend dashboard to `https://<conductor-host>/resend/webhook` listening for `email.received`.

## Testing

Run tests and type checks:
```bash
bun test && bun run check
```
Keep Sentry tracing off; URLs hold tokens.

