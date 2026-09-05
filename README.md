# Better Rail

<img src="https://better-rail.co.il/assets/images/iphone-screenshot@2x.png" width="300" align="right">

<a href="https://github.com/guytepper/better-rail/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-brightgreen" alt="" /></a>&nbsp;<a href="https://x.com/better_rail"><img src="https://img.shields.io/twitter/follow/better_rail" alt="" /></a>

Better Rail is an open source mobile client for Israel Railways, with an emphasis on great design, performance and accessibility.

**Available on the [App Store](https://apps.apple.com/il/app/better-rail/id1562982976) & [Play Store](https://play.google.com/store/apps/details?id=com.betterrail)**

## Overview

Better Rail is built with React Native. We also use Swift, SwiftUI and Kotlin to leverage native platform functionalities.

The repository is a Bun workspaces monorepo:

| Path                | What                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| `apps/mobile`       | The React Native / Expo app ([README](apps/mobile/README.md))                          |
| `apps/server`       | Notification & timetable server ([README](apps/server/README.md))                      |
| `apps/web`          | better-rail.co.il — TanStack Start site & web timetable ([README](apps/web/README.md)) |
| `packages/stations` | Station list + photos shared by every app                                              |

### Installation

The following steps assume your environment is already set up for running Expo / React Native apps (Xcode for iOS, Android Studio for Android).  
If this is your first time, check out the [Expo local development setup guide](https://docs.expo.dev/get-started/set-up-your-environment/) beforehand.

#### Prerequisites

- **Bun**: This project uses Bun as the package manager. See the [Bun installation guide](https://bun.com/docs/installation) for instructions.
- **CocoaPods** (iOS only): Required by the prebuild step. See the [installation guide](https://guides.cocoapods.org/using/getting-started.html#installation).

#### Setup Steps

- Fork the repo and clone it to your machine.
- Run `bun install` from the repository root (this installs every workspace).
- `cd apps/mobile`, then run `bun start` to start the development server.
- Android only: run `cp -v google-services{.development,}.json`
- Run the app with:
  - `bun prebuild --platform ios && bun ios` (to open the iPhone simulator)
  - `bun prebuild --platform android && bun android` (for the Android emulator).

The first run generates the native projects and may take a while.

> If you change anything that affects the native layer (config, plugins, native dependencies), run `bun prebuild` (or `bun prebuild:clean`) to regenerate the native projects.

If you want to contribute and face issues during installation, please reach out to us at feedback@better-rail.co.il and we'll try to help!

#### Workspace scripts

Every app can also be driven from the repository root:

```bash
bun run mobile:start   # Metro / Expo dev server
bun run server:dev     # server in watch mode
bun run web:dev        # website + web app on :3000
bun run lint           # oxlint + oxfmt across the repo
bun run test           # mobile + server tests
```

EAS commands run from `apps/mobile`.

### License

The source code is released under the [AGPL-3.0 license](https://github.com/guytepper/better-rail/blob/main/LICENSE).  
The project assets - the user interface, app branding, images, illustations, icons and fonts are outside the scope of the license.
