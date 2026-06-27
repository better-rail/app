const { withAppBuildGradle, withProjectBuildGradle } = require("@expo/config-plugins")
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode")

const HILT_VERSION = "2.53.1"

const APP_PLUGINS = `apply plugin: "kotlin-kapt"
apply plugin: "dagger.hilt.android.plugin"`

const DEFAULT_CONFIG = `        missingDimensionStrategy "store", "play"
        // All rail data flows through the Better Rail server: GTFS-backed timetable +
        // proxied Israel Railways API. No direct calls to rail.co.il, no API key.
        def railApiBaseUrl = "https://api.better-rail.co.il/api/v1/rail-api"
        buildConfigField "String", "RAIL_API_BASE_URL", "\\"\${railApiBaseUrl}\\""
        buildConfigField "String", "RAIL_API_TIMETABLE_URL", "\\"\${railApiBaseUrl}/rjpa/api/v1/timetable/\\""
        buildConfigField "String", "RAIL_API_PROXY_TIMETABLE_URL", "\\"\${railApiBaseUrl}/rjpa/api/v1/timetable/\\""`

const DEPENDENCIES = `    implementation("androidx.preference:preference-ktx:1.2.1")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("androidx.work:work-runtime-ktx:2.8.1")
    implementation("androidx.cardview:cardview:1.0.0")
    implementation("com.google.dagger:hilt-android:${HILT_VERSION}")
    kapt("com.google.dagger:hilt-compiler:${HILT_VERSION}")
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    kapt("androidx.room:room-compiler:2.7.0")`

const withAppGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents

    // 1) Apply kapt + Hilt gradle plugins (after the existing apply plugin lines).
    src = mergeContents({
      tag: "better-rail-android-plugins",
      src,
      newSrc: APP_PLUGINS,
      anchor: /apply plugin: "com\.facebook\.react"/,
      offset: 1,
      comment: "//",
    }).contents

    // 2) buildConfig fields + product flavor dimension strategy inside defaultConfig {}.
    src = mergeContents({
      tag: "better-rail-android-defaultconfig",
      src,
      newSrc: DEFAULT_CONFIG,
      anchor: /defaultConfig\s*{/,
      offset: 1,
      comment: "//",
    }).contents

    // 3) Ensure buildConfig build feature is enabled (required for buildConfigField).
    if (!/buildFeatures\s*{[^}]*buildConfig\s+true/s.test(src)) {
      src = mergeContents({
        tag: "better-rail-android-buildfeatures",
        src,
        newSrc: `    buildFeatures {\n        buildConfig true\n    }`,
        anchor: /android\s*{/,
        offset: 1,
        comment: "//",
      }).contents
    }

    // 4) Widget dependencies (Hilt, Room, DataStore, WorkManager, OkHttp, Gson, coroutines).
    src = mergeContents({
      tag: "better-rail-android-dependencies",
      src,
      newSrc: DEPENDENCIES,
      anchor: /dependencies\s*{/,
      offset: 1,
      comment: "//",
    }).contents

    cfg.modResults.contents = src
    return cfg
  })

const withProjectGradle = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents

    src = mergeContents({
      tag: "better-rail-android-hilt-classpath",
      src,
      newSrc: `        classpath("com.google.dagger:hilt-android-gradle-plugin:${HILT_VERSION}")`,
      anchor: /dependencies\s*{/,
      offset: 1,
      comment: "//",
    }).contents

    // Gradle 9 ignores rootProject.allprojects{} from subproject build files, so
    // notifee's local AAR repo must be declared at the root level.
    src = mergeContents({
      tag: "better-rail-android-notifee-maven",
      src,
      newSrc: `    maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`,
      anchor: /maven \{ url 'https:\/\/www\.jitpack\.io' \}/,
      offset: 1,
      comment: "//",
    }).contents

    cfg.modResults.contents = src
    return cfg
  })

const withAndroidGradle = (config) => withProjectGradle(withAppGradle(config))

module.exports = { withAndroidGradle }
