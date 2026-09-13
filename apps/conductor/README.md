# The Conductor

Better Rail's onboarding bot. A button in `#welcome` starts a private, two-step
flow: choose **iOS or Android** (required), then a **favorite station**
(optional, with **Skip for now**). Choices become permissionless server roles
with short lowercase names such as `hashalom` or `bet yehoshua`. Members can
repeat the flow to change their choices.

The service receives signed Discord HTTP interactions. It registers no slash
commands, needs no privileged Gateway intents, and has no database: Discord
stores the role assignments.

The flow starts from the welcome button. It does not replace Discord's native
join screen or prevent members from using other public channels before choosing
a device. The device choice is required to complete this flow.

## Discord setup

1. Create **Conductor** in the Discord Developer Portal under the team's
   ownership and generate its bot token. Keep the token in `.env` locally and in
   Railway's service variables in production.
2. Install the bot in Better Rail with only **Manage Roles**, **View Channels**,
   and **Send Messages**.
3. Keep its role below staff/private access roles and above the flair roles.
4. Copy `.env.example` to `.env` and fill in the application ID, public key,
   token, guild ID, and public welcome channel ID.
5. Run `bun run setup`. It creates or reuses the flair roles, posts or updates
   the welcome message, and saves the role and message IDs to
   `.conductor-setup.json`. When running from another machine, set
   `DISCORD_PICKER_MESSAGE_ID` to update the existing message.
6. Set `DISCORD_PLATFORM_ROLES` and `DISCORD_STATION_ROLES` to the
   `platformRoles` and `stationRoles` objects from `.conductor-setup.json`,
   locally and on Railway.
7. Deploy `apps/conductor` as its own Railway service (Dockerfile and
   `railway.json`). Set the Discord **Interactions Endpoint URL** to
   `https://<service-domain>/discord/interactions`. `/health` is the health check.
   Keep one replica: role changes are serialized per member in-process.
   Set `SENTRY_DSN` to the DSN of the `conductor` Sentry project, which is
   separate from the mobile app's project.
8. Put `#welcome` first in the public category and select it for Discord's new
   member system messages.

## Verification

Run `bun test` and `bun run check`. Before going live, verify in Discord: start,
choose iOS, skip station, restart, choose Android, choose `hashalom`, switch to
`hahagana`, and remove station flair. Confirm only the intended roles changed,
and that an ordinary new member can see the welcome channel but gains no beta or
developer channel access from these roles.

## Maintenance

`src/stations.ts` mirrors the server's station IDs and Hebrew labels. Update it
when stations change and rerun setup. Logs and Sentry events exclude bot tokens,
interaction tokens, request bodies, and member identifiers. Keep Sentry tracing
off unless outgoing request URLs are scrubbed: webhook URLs contain interaction
tokens.
