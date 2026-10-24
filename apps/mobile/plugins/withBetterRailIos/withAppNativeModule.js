const { withXcodeProject } = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

/**
 * Injects the main-app native module (RNBetterRail) and the business-logic Swift files it
 * shares with the widget into the generated BetterRail app target — reproducing the original
 * bare project's multi-target membership.
 *
 * The localized Route.intentdefinition (Base + he/ar/ru Route.strings) is added to the app
 * target's Sources phase with INTENTS_CODEGEN_LANGUAGE=Swift so Xcode generates
 * RouteIntent/INStation for the app (exactly as before), avoiding any hand-written or
 * pre-generated intent boilerplate.
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
  ["targets/notification-service/ArrivalAlarm.swift", "ArrivalAlarm.swift"],
]
const OBJC_FILES = [["ios-native/app/RNBetterRail.m", "RNBetterRail.m"]]
// The intent definition is localized: Base.lproj holds the definition, and each other locale
// ships a Route.strings with the translated titles. App Store Connect flags the build with
// ITMS-90626 if a locale the app supports has no translation for the intent title.
const INTENT_DEF_DIR = "targets/widget"
const INTENT_DEF_NAME = "Route.intentdefinition"
const INTENT_DEF_LOCALES = ["he", "ar", "ru"]
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

    // Intent definition -> Sources phase (triggers RouteIntent codegen), as a variant group
    // holding the Base definition plus each locale's Route.strings — the same shape Xcode
    // gives a localized intent definition.
    const intentFiles = [
      ["Base", INTENT_DEF_NAME, "file.intentdefinition"],
      ...INTENT_DEF_LOCALES.map((locale) => [locale, "Route.strings", "text.plist.strings"]),
    ]
    for (const [locale, fileName] of intentFiles) {
      const relPath = path.join(`${locale}.lproj`, fileName)
      fs.mkdirSync(path.join(destDir, `${locale}.lproj`), { recursive: true })
      copy(path.join(INTENT_DEF_DIR, relPath), relPath)
    }
    // Idempotent: skip if a non-clean prebuild already added the variant group.
    if (!proj.findPBXVariantGroupKey({ name: INTENT_DEF_NAME })) {
      const variantKey = proj.pbxCreateVariantGroup(INTENT_DEF_NAME)
      proj.addToPbxGroup(variantKey, groupKey)
      for (const [locale, fileName, fileType] of intentFiles) {
        const file = proj.addFile(`${locale}.lproj/${fileName}`, variantKey, { lastKnownFileType: fileType })
        if (!file) throw new Error(`[withBetterRailIos] failed to add ${locale}.lproj/${fileName}`)
        // Xcode names variant children after their locale.
        proj.pbxFileReferenceSection()[file.fileRef].name = locale
        proj.pbxFileReferenceSection()[`${file.fileRef}_comment`] = locale
      }
      const buildFile = { uuid: proj.generateUuid(), fileRef: variantKey, basename: INTENT_DEF_NAME, target: targetKey }
      proj.addToPbxBuildFileSection(buildFile)
      proj.addToPbxSourcesBuildPhase(buildFile)
    }
    for (const locale of INTENT_DEF_LOCALES) proj.addKnownRegion(locale)

    // Bundled resources -> Copy Bundle Resources phase (loaded via Bundle.main at runtime).
    // NOTE: we deliberately avoid proj.addResourceFile(). In xcode@3.0.1 it unconditionally
    // calls correctForResourcesPath(), which dereferences a PBXGroup literally named
    // "Resources" — a group Expo's freshly generated project doesn't have, so it throws
    // "Cannot read properties of null (reading 'path')" on a clean EAS prebuild. Instead we
    // mirror addSourceFile's lower-level wiring (addFile -> build-file -> Resources phase),
    // which skips that path-correction entirely.
    for (const [relSrc, destName] of RESOURCE_FILES) {
      copy(relSrc, destName)
      // Idempotent: on a non-clean prebuild the file reference already exists, and
      // proj.addFile() returns false in that case. Skip rather than throw, mirroring
      // addSourceFile's silent no-op above, so plain `expo prebuild` doesn't fail.
      if (proj.hasFile(destName)) continue
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
