# The Conductor

Better Rail's onboarding bot. A welcome button starts a private Hebrew flow:
choose **iPhone or Android**, then receive a thank-you message with links to
`#feedback` and `#general`. The device choice is required to complete the flow.
It assigns a permissionless `ios` or `android` role with no channel permission
overwrites. Members can repeat the flow to change their device.

Conductor's avatar and Hebrew voice provide the railway theme. There is no
station selection or station flair. Old station buttons and search dialogs
return to device selection without assigning roles.

The service verifies signed Discord HTTP interactions, registers no slash
commands, needs no privileged Gateway intents, and has no database. Discord
stores the device assignment. Role changes are serialized per member. Failed
mutations attempt to restore the original roles; incomplete compensation is
reported to Sentry.

The flow starts from the welcome button. It does not replace Discord's native
join screen or prevent members from using other public channels beforehand.

## Discord setup

1. Create **Conductor** in the Discord Developer Portal under the team's
   ownership and generate its bot token. Keep the token in `.env` locally and in
   Railway's service variables in production.
2. Install the bot in Better Rail with only **Manage Roles**, **View Channels**,
   and **Send Messages**.
3. Keep its role below staff/private access roles and above the device roles.
4. Copy `.env.example` to `.env` and fill in the application ID, public key,
   token, guild ID, and public welcome channel ID.
5. Run `bun run setup`. It creates or reuses the device roles, posts or updates
   the welcome message, and saves the role and message IDs to
   `.conductor-setup.json`. When running from another machine, set
   `DISCORD_PICKER_MESSAGE_ID` to update the existing message.
6. Set `DISCORD_PLATFORM_ROLES` to the `platformRoles` object from
   `.conductor-setup.json`, locally and on Railway.
7. Deploy `apps/conductor` as its own Railway service (Dockerfile and
   `railway.json`). Set the Discord **Interactions Endpoint URL** to
   `https://<service-domain>/discord/interactions`. `/health` is the health check.
   Keep one replica: role changes are serialized per member in-process.
   Set `SENTRY_DSN` to the DSN of the separate `conductor` Sentry project.
8. Put `#welcome` first in the public category and select it for Discord's new
   member system messages. Ensure `@everyone` has both **View Channel** and
   **Read Message History** so new members can see the persistent button.

## Verification

Run `bun test` and `bun run check`. Before going live, verify in Discord:
start, choose iPhone, see the thank-you message, restart, and choose Android.
Confirm only the device roles changed, only one device remains assigned, and an
ordinary new member can see the welcome channel but gains no beta or developer
channel access. Old station controls should return to device choice.

## Maintenance

Discord will start omitting channels the bot cannot view from the HTTP channel
list on November 16, 2026. From that date, setup and role selection stop before
any role mutations unless the bot already has Administrator, which guarantees
visibility across channel overwrites. The current deployment uses limited
permissions and will therefore stop assigning roles on that date. Before then,
replace the HTTP-only audit with a complete channel inventory, such as a Gateway
integration that detects obfuscated channels and refuses incomplete audits.
This guard does not grant permissions or change the installation permissions.
See [Discord's announcement](https://docs.discord.com/developers/change-log#channel-obfuscation-for-users-and-bots).

Logs and Sentry events exclude bot tokens, interaction tokens, request bodies,
and member identifiers. Keep Sentry tracing off unless outgoing request URLs
are scrubbed: webhook URLs contain interaction tokens.
