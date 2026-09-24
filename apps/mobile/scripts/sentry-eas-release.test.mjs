import assert from "node:assert/strict"
import { test } from "node:test"

import { getAndroidBuildVersion, getIosBuildVersion, getReleaseName } from "./sentry-eas-release.mjs"

test("Android uses the version code written into the native project by EAS", () => {
  const gradleFile = `defaultConfig {
    versionCode 199
    versionName "2.8.2"
  }`
  const buildVersion = getAndroidBuildVersion(gradleFile)

  assert.equal(buildVersion, "199")
  assert.equal(
    getReleaseName({
      platform: "android",
      appVersion: "2.8.2",
      buildVersion,
      expoConfig: { android: { package: "com.betterrail", versionCode: 157 } },
    }),
    "com.betterrail@2.8.2+199",
  )
})

test("iOS reads the main app Release build number, not an extension build number", () => {
  const projectFile = `/* Release */ = {
    buildSettings = {
      CURRENT_PROJECT_VERSION = 4;
      PRODUCT_BUNDLE_IDENTIFIER = "il.co.better-rail.BetterRailWidget";
    };
    name = Release;
  };
  /* Release */ = {
    buildSettings = {
      CURRENT_PROJECT_VERSION = 200;
      PRODUCT_BUNDLE_IDENTIFIER = "il.co.better-rail";
    };
    name = Release;
  };`

  assert.equal(getIosBuildVersion(projectFile, "il.co.better-rail"), "200")
})
