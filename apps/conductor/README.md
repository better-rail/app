# The Conductor

Discord bot that handles:

1. Community onboarding: assigns `ios` or `android` roles from welcome buttons.
2. Email feedback bridge: routes incoming customer emails to `#email-feedback` Discord threads and sends outbound replies via `/reply` through Resend.

## Setup

1. Fill `.env` from `.env.example` and run `bun run setup` (provisions flair roles, posts welcome picker, and registers `/reply` command).
2. Copy `platformRoles` from `.conductor-setup.json` to `DISCORD_PLATFORM_ROLES`.
3. Set the Interactions Endpoint URL in the Discord Developer Portal to `https://<worker-url>/discord/interactions` so `/reply` reaches the bot.
4. Set Resend inbound webhook in the Resend dashboard to `https://<worker-url>/resend/webhook` listening for `email.received`.

`<worker-url>` is the deployed Worker's host, `conductor.<account>.workers.dev` unless a custom domain is attached.
`bun run dev` (`wrangler dev`) serves the same routes locally and reads the secrets from `.env` (or `.dev.vars` if present).

## Testing

Run tests and type checks:

```bash
bun test && bun run check
```

Keep Sentry tracing off; URLs hold tokens.

## Deployment

The Conductor is a Cloudflare Worker (`wrangler.jsonc`). Workers Builds deploys it from this repository, like the web
app, whenever a push to `main` touches it:

| Setting                              | Value                                      |
| ------------------------------------ | ------------------------------------------ |
| Production branch                    | `main`                                     |
| Root directory                       | `apps/conductor`                           |
| Build command                        | `bun install && bun test && bun run check` |
| Deploy command                       | `bunx wrangler deploy`                     |
| Non-production branch deploy command | `bunx wrangler versions upload`            |
| Build watch paths (include)          | `apps/conductor/*`, `bun.lock`             |
| Build variable                       | `BUN_VERSION` = `1.3.9`                    |

To deploy by hand: `bunx wrangler deploy` from `apps/conductor` with a logged-in wrangler.

Secrets are set once and survive deploys (`wrangler secret put <NAME>` from `apps/conductor`, or in the dashboard):
`DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_PLATFORM_ROLES`,
`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `DISCORD_EMAIL_FEEDBACK_CHANNEL_ID` and `SENTRY_DSN` (the Sentry `conductor` project).

After the first deploy, point the Discord Interactions Endpoint URL and the Resend webhook at the Worker's URL (Setup steps 3
and 4). `GET /health` answers `{ "ok": true }` for uptime checks. Request bodies are capped at 64 KB (413 above that), as before.
