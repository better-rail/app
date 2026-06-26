const { withXcodeProject, withDangerousMod } = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

/**
 * Recreates the app target's Objective-C bridging header (as in the original bare project) so
 * the Swift AppDelegate can call RNShortcuts via its ObjC header, instead of `import`-ing the
 * react_native_actions_shortcuts module. The module import triggers a "duplicate interface
 * definition for class 'RNShortcuts'" error because that pod declares the class in both an ObjC
 * header and a Swift @objc class.
 */
const BRIDGING_HEADER_REL = "BetterRail/BetterRail-Bridging-Header.h"
const BRIDGING_HEADER_CONTENTS = `// Better Rail bridging header (CNG-managed).
#import <React/RCTBridgeModule.h>
#import "RNShortcuts.h"
`

const withBridgingHeaderFile = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, BRIDGING_HEADER_REL)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, BRIDGING_HEADER_CONTENTS)
      return cfg
    },
  ])

const withBridgingHeaderSetting = (config) =>
  withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults
    const targets = proj.pbxNativeTargetSection()
    const cfgs = proj.pbxXCBuildConfigurationSection()
    const lists = proj.pbxXCConfigurationList()
    for (const key in targets) {
      const t = targets[key]
      if (!t || !t.name || t.name.replace(/"/g, "") !== "BetterRail") continue
      const refs = lists[t.buildConfigurationList].buildConfigurations.map((c) => c.value)
      for (const ref of refs) {
        const s = cfgs[ref] && cfgs[ref].buildSettings
        if (s) s.SWIFT_OBJC_BRIDGING_HEADER = `"${BRIDGING_HEADER_REL}"`
      }
    }
    return cfg
  })

const withAppBridgingHeader = (config) => withBridgingHeaderSetting(withBridgingHeaderFile(config))

module.exports = { withAppBridgingHeader }
