const { withAndroidManifest } = require("@expo/config-plugins")

/**
 * Adds the widget components to AndroidManifest: the two AppWidget providers, the
 * alarm/boot update receiver, the RemoteViews service, the two configuration activities, and
 * the Firebase notification icon. Permissions and the betterrail:// deep link are declared in
 * app.config.ts.
 */
const APPWIDGET_UPDATE = "android.appwidget.action.APPWIDGET_UPDATE"

const widgetReceiver = (name, refresh, update, info) => ({
  $: { "android:name": name, "android:exported": "true" },
  "intent-filter": [
    {
      action: [
        { $: { "android:name": APPWIDGET_UPDATE } },
        { $: { "android:name": refresh } },
        { $: { "android:name": update } },
      ],
    },
  ],
  "meta-data": [{ $: { "android:name": "android.appwidget.provider", "android:resource": info } }],
})

const configActivity = (name) => ({
  $: {
    "android:name": name,
    "android:label": "@string/widget_configure_title",
    "android:exported": "false",
  },
  "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_CONFIGURE" } }] }],
})

const withAndroidManifestMods = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest

    // Firebase's AAR merges com.google.android.gms.permission.AD_ID during the Gradle build.
    // tools:node="remove" tells the manifest merger to strip it, which is the only way to
    // override a permission injected by a library dependency at build time (not at prebuild time).
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools"
    manifest["uses-permission"] = manifest["uses-permission"] || []
    manifest["uses-permission"].push({
      $: { "android:name": "com.google.android.gms.permission.AD_ID", "tools:node": "remove" },
    })

    // Package visibility (API 30+): lets Linking.canOpenURL see the X / Instagram apps.
    manifest.queries = manifest.queries || [{}]
    manifest.queries[0].intent = [
      ...(manifest.queries[0].intent || []),
      ...["twitter", "instagram"].map((scheme) => ({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": scheme } }],
      })),
    ]

    const app = manifest.application[0]

    app.activity = app.activity || []
    app.receiver = app.receiver || []
    app.service = app.service || []
    app["meta-data"] = app["meta-data"] || []

    app.activity.push(
      configActivity(".widget.CompactWidget2x2ConfigActivity"),
      configActivity(".widget.CompactWidget4x2ConfigActivity"),
      configActivity(".widget.CompactWidget4x3ConfigActivity"),
    )

    app.receiver.push(
      widgetReceiver(
        ".widget.ModernCompactWidget2x2Provider",
        "com.betterrail.widget.modern.compact.ACTION_REFRESH",
        "com.betterrail.widget.modern.compact.ACTION_WIDGET_UPDATE",
        "@xml/compact_widget_2x2_info",
      ),
      widgetReceiver(
        ".widget.ModernCompactWidget4x2Provider",
        "com.betterrail.widget.modern.compact4x2.ACTION_REFRESH",
        "com.betterrail.widget.modern.compact4x2.ACTION_WIDGET_UPDATE",
        "@xml/compact_widget_4x2_info",
      ),
      widgetReceiver(
        ".widget.ModernCompactWidget4x3Provider",
        "com.betterrail.widget.modern.compact4x3.ACTION_REFRESH",
        "com.betterrail.widget.modern.compact4x3.ACTION_WIDGET_UPDATE",
        "@xml/compact_widget_4x3_info",
      ),
      { $: { "android:name": ".widget.WidgetPinReceiver", "android:exported": "false" } },
      {
        $: { "android:name": ".widget.scheduler.WidgetUpdateReceiver", "android:exported": "false" },
        "intent-filter": [
          { action: [{ $: { "android:name": "com.betterrail.widget.UPDATE_ALL_WIDGETS" } }] },
          {
            action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.MY_PACKAGE_REPLACED" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:scheme": "package" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.PACKAGE_REPLACED" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:scheme": "package" } }],
          },
        ],
      },
    )

    app.service.push({
      $: {
        "android:name": ".widget.TrainWidgetService",
        "android:permission": "android.permission.BIND_REMOTEVIEWS",
        "android:exported": "false",
      },
    })

    // Arrival alarm: the exact alarm fires the receiver, which starts the ringing service, whose
    // notification opens the full-screen alarm. The receiver also restores the alarm after a reboot.
    app.receiver.push({
      $: { "android:name": ".alarm.ArrivalAlarmReceiver", "android:exported": "false" },
      "intent-filter": [
        {
          action: [
            { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
            { $: { "android:name": "android.intent.action.MY_PACKAGE_REPLACED" } },
            { $: { "android:name": "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" } },
          ],
        },
      ],
    })
    app.service.push({
      $: {
        "android:name": ".alarm.ArrivalAlarmService",
        "android:exported": "false",
        // Allowed for apps holding the exact alarm permission, to keep an alarm ringing.
        "android:foregroundServiceType": "systemExempted",
      },
    })
    app.activity.push({
      $: {
        "android:name": ".alarm.ArrivalAlarmActivity",
        "android:exported": "false",
        "android:theme": "@android:style/Theme.Material.NoActionBar",
        "android:showWhenLocked": "true",
        "android:turnScreenOn": "true",
        "android:excludeFromRecents": "true",
        "android:launchMode": "singleInstance",
        "android:taskAffinity": "",
      },
    })

    app["meta-data"].push({
      $: {
        "android:name": "com.google.firebase.messaging.default_notification_icon",
        "android:resource": "@drawable/notification_icon",
      },
    })

    return cfg
  })

module.exports = { withAndroidManifestMods }
