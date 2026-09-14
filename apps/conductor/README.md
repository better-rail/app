# The Conductor

Better Rail's onboarding bot. A button in `#welcome` starts a private, two-step
flow: choose **iPhone or Android** (required), then **up to two favorite stations**
(optional, with **דילוג**). Copy and buttons are Hebrew; station labels stay in
English, with their Hebrew names underneath. Choices become permissionless server roles
with no channel permission overwrites and short lowercase names such as `hashalom` or `bet yehoshua`. Members can
repeat the flow to change their choices. Failed role mutations attempt to restore
the original choices; incomplete compensation is reported to Sentry.

The station step starts with **חיפוש תחנה**. A text popup accepts Hebrew or English,
then automatically adds the closest matching station to the draft. Exact names
rank first, followed by prefix and interior matches. Search again to add a second
favorite, or remove a choice to retry. Search ignores spaces and punctuation. Draft station IDs travel in component IDs through the modal. **סיום** saves
the favorites; **חזרה אחורה** discards the draft and returns to device selection.
Existing favorites are shown when editing. Remove favorites and press
**סיום** to remove them. **דילוג** leaves existing favorites unchanged.

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
choose iPhone, skip stations, restart, choose Android, search in Hebrew and English, select two favorites, confirm with **סיום**, edit the pair, and remove station flair.
Confirm no-results searches can be retried, a third selection is rejected, Back discards drafts, and only the intended roles changed,
and that an ordinary new member can see the welcome channel but gains no beta or
developer channel access from these roles.

## Maintenance

`src/stations.ts` mirrors the server's station IDs and Hebrew labels. Update it
when stations change and rerun setup. Logs and Sentry events exclude bot tokens,
interaction tokens, request bodies, and member identifiers. Keep Sentry tracing
off unless outgoing request URLs are scrubbed: webhook URLs contain interaction
tokens.
