<img src="https://better-rail.co.il/assets/images/iphone-screenshot@2x.png" width="300" align="right">

# Better Rail

<a href="https://github.com/guytepper/better-rail/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-brightgreen" alt="" /></a>&nbsp;<a href="https://twitter.com/better_rail"><img src="https://img.shields.io/twitter/follow/better_rail" alt="" /></a>

Better Rail is an open source mobile client for Israel Railways, with an emphasis on great design, performance and accessibility.

**Available on the [App Store](https://apps.apple.com/il/app/better-rail/id1562982976)</a> & [Play Store](https://play.google.com/store/apps/details?id=com.betterrail)**

## Overview

Better Rail is written primarily with React Native. We also use Swift & Swift UI for integrating with the native iOS capabilities.

### Installation

The following steps assumes your environment is already set up for running React Native apps.  
If this is your first time, check out the [official set up guide](https://reactnative.dev/docs/environment-setup) beforehand.

> Note: Building for iOS requires Xcode 14.2 or above

- Fork the repo and clone to your machine.
- Run `yarn install`
- **MacOS / Linux users**: Run `yarn rename-dev-configs` to rename the firebase development configs.
- **Windows users**: Duplicate the firebase configs in `/ios` and `/android/app`, and remove the `.development` suffix from the duplicated files.
- Run `yarn start` to start the metro development server
- Run the app with `yarn ios` (to open the iPhone simulator) or `yarn android` (for the Android simulator).

If you want to contribute and face issues during instllation, please reach out to us at feedback@better-rail.co.il and we'll try to help!

### License

The source code is released under the [AGPL-3.0 license](https://github.com/guytepper/better-rail/blob/main/LICENSE).  
The project assets - the user interface, app branding, images, illustations, icons and fonts are outside the scope of the license.
