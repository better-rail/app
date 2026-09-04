# Better Rail

Better Rail is an open source mobile client for Israel Railways, with an emphasis on great design, performance and accessibility.

**Available on the [App Store](https://apps.apple.com/il/app/better-rail/id1562982976) & [Play Store](https://play.google.com/store/apps/details?id=com.betterrail)**

This is a Bun workspaces monorepo:

| Path            | What                                                      |
| --------------- | --------------------------------------------------------- |
| `apps/mobile`   | The React Native / Expo app ([README](apps/mobile/README.md)) |
| `apps/server`   | Notification & timetable server ([README](apps/server/README.md)) |
| `apps/website`  | better-rail.co.il static site ([README](apps/website/README.md)) |
| `packages/`     | Shared packages (none yet)                                |

## Getting started

```bash
bun install            # installs every workspace
bun run mobile:start   # Metro / Expo dev server
bun run server:dev     # server in watch mode
bun run website:dev    # static site on :8000
bun run lint           # oxlint + oxfmt across the repo
bun run test           # mobile + server tests
```

Per-app scripts still work from inside the app directory (e.g. `cd apps/mobile && bun ios`), and EAS commands run from `apps/mobile`.
