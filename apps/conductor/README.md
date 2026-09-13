# The Conductor

Better Rail's own onboarding bot. A welcome message starts a private, two-step
flow: choose **iOS or Android** (required), then choose a **favorite station**
(optional, with **Skip for now**). Choices become permissionless server roles.
Station names use short lowercase transliterations, such as `hashalom`,
`hahagana`, and `bet yehoshua`. Members can repeat the flow to change their choices.

The service receives signed Discord HTTP interactions. It does not register
slash commands, search messages, or need privileged Gateway intents. There is no
database: Discord stores the role assignments. The flow starts from a button in
`#welcome`; it does not interrupt the Discord join screen or gate other channels.

## Discord setup

1. Create **The Conductor** in the Discord Developer Portal under the team's
   ownership. App creation requires accepting Discord's Developer Terms and Policy.
2. Configure its bot identity and generate its token. Keep it in `.env` locally
   and Railway's service variables in production; do not paste it into chat.
3. Install the bot in Better Rail with **Manage Roles**, **View Channels**, and
   **Send Messages**. No Administrator or moderation permissions are needed.
4. Keep its role below staff/private access roles and above the flair roles.
5. Copy `.env.example` to `.env` and fill the application ID, public key, token,
   guild ID, and public welcome channel ID.
6. From this directory, run `bun run setup`. This creates/reuses permissionless
   platform and station roles, posts the welcome message, and saves role IDs to
   `.station-roles.json`. Repeat setup with `DISCORD_PICKER_MESSAGE_ID` to update
   the existing message. The previous local setup ID is reused automatically.
7. Set `DISCORD_PLATFORM_ROLES` and `DISCORD_STATION_ROLES` to the corresponding
   JSON objects from `.station-roles.json`, locally and on Railway.
8. Deploy this directory as its own Railway service using the Dockerfile and
   `railway.json`. Set the Discord **Interactions Endpoint URL** to
   `https://<service-domain>/discord/interactions`. `/health` is the health check.
9. Put `#welcome` first in the public category and select it for Discord's new
   member system messages so arriving members find the flow. Pin the welcome
   message as the server owner if desired.

Only deploy `apps/conductor` as the archive root; it has no external dependencies
and needs no passenger data, Redis, push credentials, or train API access. Use
one replica: role changes are serialized per member within this process.

## Verification

Run `bun test`, `bun run check`, and the repository formatter/linter on this
directory. Tests exercise the signed HTTP endpoint, required device selection,
optional station skip, role switching, concurrency, signature expiry, replays,
and refusal to assign roles with expanded permissions.

Before going live, verify in Discord: start, choose iOS, skip station, restart,
choose Android, choose `hashalom`, switch to `hahagana`, and remove station flair.
Confirm only the intended platform/station roles changed. As an ordinary new
member, verify the welcome channel is visible and neither beta nor developer
channels become accessible from these flair roles.

## Maintenance

`src/stations.ts` contains the station catalog, with IDs and Hebrew labels taken
from the server's station data. Update this catalog when stations change and rerun
setup. Existing role IDs persist across deployments. Logs deliberately exclude
bot tokens, interaction tokens, request bodies, and member identifiers.
