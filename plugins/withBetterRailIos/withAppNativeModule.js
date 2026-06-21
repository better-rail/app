const { withXcodeProject } = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

/**
 * Injects the main-app native module (RNBetterRail) and the business-logic Swift files it
 * shares with the widget into the generated BetterRail app target — reproducing the original
 * bare project's multi-target membership.
 *
 * The Route.intentdefinition is added to the app target's Sources phase with
 * INTENTS_CODEGEN_LANGUAGE=Swift so Xcode generates RouteIntent/INStation for the app (exactly
 * as before), avoiding any hand-written or pre-generated intent boilerplate.
 *
 * Single source of truth: the shared files are read from ./targets/widget (consumed by the
 * widget target too); only app-only files live in ./ios-native/app.
 */

// [sourceRelativeToRepoRoot, destFileName]
const SWIFT_FILES = [
  ["ios-native/app/RNBetterRail.swift", "RNBetterRail.swift"],
  ["ios-native/app/Swifty.swift", "Swifty.swift"],
  ["targets/widget/Live Activity/Activity.swift", "Activity.swift"],
  ["targets/widget/Live Activity/ActivityNotificationsAPI.swift", "ActivityNotificationsAPI.swift"],
  ["targets/widget/Live Activity/ActivityUtils.swift", "ActivityUtils.swift"],
  ["targets/widget/Live Activity/TokenRegistry.swift", "TokenRegistry.swift"],
  ["targets/widget/Extensions.swift", "Extensions.swift"],
  ["targets/widget/Models/TrainDetail.swift", "TrainDetail.swift"],
  ["targets/widget/Shared/RouteModel.swift", "RouteModel.swift"],
  ["targets/widget/Shared/StationModel.swift", "StationModel.swift"],
  ["targets/widget/Shared/Utilities.swift", "Utilities.swift"],
]
const OBJC_FILES = [["ios-native/app/RNBetterRail.m", "RNBetterRail.m"]]
const INTENT_DEF = ["targets/widget/Base.lproj/Route.intentdefinition", "Route.intentdefinition"]
// Bundled (not compiled) — StationModel.load() reads this from Bundle.main at runtime.
const RESOURCE_FILES = [["ios-native/app/stationsData.json", "stationsData.json"]]

const DEST_SUBDIR = "BetterRailNative" // lives under ios/BetterRail/BetterRailNative

const withAppNativeModule = (config) =>
  withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults
    const projectRoot = cfg.modRequest.projectRoot
    const iosRoot = cfg.modRequest.platformProjectRoot // .../ios
    const destDir = path.join(iosRoot, "BetterRail", DEST_SUBDIR)
    fs.mkdirSync(destDir, { recursive: true })

    const targetKey = proj.findTargetKey("BetterRail")
    if (!targetKey) throw new Error("[withBetterRailIos] BetterRail target not found")

    // Group under the BetterRail group; pbxproj group path is relative to ios/BetterRail.
    const groupKey = proj.pbxCreateGroup(DEST_SUBDIR, `BetterRail/${DEST_SUBDIR}`)
    const appGroupKey = proj.findPBXGroupKey({ name: "BetterRail" })
    if (appGroupKey) proj.addToPbxGroup(groupKey, appGroupKey)

    const copy = (relSrc, destName) => {
      const src = path.join(projectRoot, relSrc)
      fs.copyFileSync(src, path.join(destDir, destName))
    }

    // Compiled Swift + ObjC sources -> Sources build phase of the app target.
    // File paths are basenames: the group's own path (BetterRail/BetterRailNative) supplies
    // the prefix, so passing the subdir again would double it.
    for (const [relSrc, destName] of [...SWIFT_FILES, ...OBJC_FILES]) {
      copy(relSrc, destName)
      proj.addSourceFile(destName, { target: targetKey }, groupKey)
    }

    // Intent definition -> Sources phase (triggers RouteIntent codegen).
    copy(INTENT_DEF[0], INTENT_DEF[1])
    proj.addSourceFile(INTENT_DEF[1], { target: targetKey }, groupKey)

    // Bundled resources -> Copy Bundle Resources phase (loaded via Bundle.main at runtime).
    // NOTE: we deliberately avoid proj.addResourceFile(). In xcode@3.0.1 it unconditionally
    // calls correctForResourcesPath(), which dereferences a PBXGroup literally named
    // "Resources" — a group Expo's freshly generated project doesn't have, so it throws
    // "Cannot read properties of null (reading 'path')" on a clean EAS prebuild. Instead we
    // mirror addSourceFile's lower-level wiring (addFile -> build-file -> Resources phase),
    // which skips that path-correction entirely.
    for (const [relSrc, destName] of RESOURCE_FILES) {
      copy(relSrc, destName)
      const resFile = proj.addFile(destName, groupKey, { target: targetKey })
      if (!resFile) throw new Error(`[withBetterRailIos] failed to add resource ${destName}`)
      resFile.target = targetKey
      resFile.uuid = proj.generateUuid()
      proj.addToPbxBuildFileSection(resFile)
      proj.addToPbxResourcesBuildPhase(resFile)
    }

    // Enable Swift intent codegen on the app target.
    const configurations = proj.pbxXCBuildConfigurationSection()
    const buildConfigList = proj.pbxNativeTargetSection()[targetKey].buildConfigurationList
    const listSection = proj.pbxXCConfigurationList()
    const configRefs = listSection[buildConfigList].buildConfigurations.map((c) => c.value)
    for (const ref of configRefs) {
      const settings = configurations[ref]?.buildSettings
      if (settings) settings.INTENTS_CODEGEN_LANGUAGE = "Swift"
    }

    return cfg
  })

module.exports = { withAppNativeModule, DEST_SUBDIR }
