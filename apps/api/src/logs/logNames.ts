export const logNames = {
  server: {
    listening: "App listening",
    dataSource: "Serving timetable data from",
    ridesDisabled: "Ride tracking is disabled",
    unhandled: "Unhandled request error",
    cron: "Cron trigger",
    stationAlertsDisabled: "Station alerts and Delay Notifications are disabled, subscriptions are not taken or watched",
  },
  stationAlerts: {
    started: "Station alerts watcher started",
    checkFailed: "Station alerts check failed",
    recovered: "Station alerts watcher recovered",
    pushed: "Pushed a station alert",
    sendFailed: "Failed to push a station alert",
    dropped: "Dropped a station alerts subscription whose device is gone",
    subscribed: "Registered a station alerts subscription",
    unsubscribed: "Removed a station alerts subscription",
    storeFailed: "Failed to store a station alerts subscription",
    corruptSubscription: "Skipped a station alerts subscription that could not be read",
  },
  delayGuards: {
    started: "Delay Notifications watcher started",
    checkFailed: "Delay Notifications check failed",
    recovered: "Delay Notifications watcher recovered",
    pushed: "Pushed a Delay Notifications alert",
    dropped: "Dropped a Delay Notifications subscription whose device is gone",
    subscribed: "Registered a Delay Notifications subscription",
    unsubscribed: "Removed a Delay Notifications subscription",
    storeFailed: "Failed to store a Delay Notifications subscription",
    corruptSubscription: "Skipped a Delay Notifications subscription that could not be read",
  },
  redis: {
    connect: {
      success: "Connected to the store",
      failed: "Couldn't connect to the store",
      skipped: "REDIS_URL is not set, skipping redis",
    },
    rides: {
      get: {
        success: "Got ride from the store",
        failed: "Failed to get ride from the store",
      },
      getAll: {
        success: "Got all rides from the store",
        failed: "Failed to get all rides from the store",
      },
      add: {
        success: "Added ride to the store",
        failed: "Failed to add ride to the store",
      },
      delete: {
        success: "Deleted ride from the store",
        failed: "Failed to delete ride from the store",
      },
      updateNotificationId: {
        success: "Updated last notification id in the store",
        failed: "Failed to update last notification id in the store",
      },
      updateToken: {
        success: "Updated token for ride in the store",
        failed: "Failed to update token for ride in the store",
      },
      updateAlarm: {
        success: "Updated arrival alarm for ride in the store",
        failed: "Failed to update arrival alarm for ride in the store",
      },
    },
  },
  scheduler: {
    scheduleExisting: "Scheduled existing rides",
    rideInPast: "The requested ride is in the past",
    rideInFuture: "The requested ride is in the future",
    scheduleRide: {
      success: "Scheduled notifications for ride",
      failed: "Failed to register notifications for ride",
    },
    rescheduleRide: {
      success: "Rescheduled notifications for ride",
      failed: "Failed to re-register notifications for ride",
    },
    updateDelay: {
      register: "Registered delay updater",
      updated: "Updated delay for ride",
      cancel: "Canceled delay updater for ride",
    },
    cancelRide: {
      success: "Canceled notifications for ride",
      failed: "Failed to cancel notifications for ride",
    },
    updateRideToken: {
      success: "Updated ride token for ride",
      failed: "Failed to update ride token for ride",
    },
    setAlarm: {
      success: "Set arrival alarm for ride",
      failed: "Failed to set arrival alarm for ride",
    },
    removeAlarm: {
      success: "Removed arrival alarm for ride",
      failed: "Failed to remove arrival alarm for ride",
    },
  },
  notifications: {
    log: "Got notification",
    notConfigured: "Push credentials are missing, notifications are disabled",
    apnTokenMinted: "Signed a new APNs provider token",
    apple: {
      success: "Sent notification to APN successully!",
      failed: "Failed to send notificaiton to APN",
    },
    android: {
      success: "Sent notification to FCM successully!",
      failed: "Failed to send notificaiton to FCM",
    },
    alarm: {
      success: "Sent arrival alarm update",
      failed: "Failed to send arrival alarm update",
    },
  },
  routeApi: {
    getRoutes: {
      success: "Got route successfully",
      failed: "Failed to get route",
    },
  },
  railApi: {
    notConfigured: "RAIL_DATA_SOURCE is 'rail' but RAIL_URL / RAIL_API_KEY are unset",
    proxy: {
      failed: "Failed to proxy a request to the Israel Railways API",
      timedOut: "Israel Railways API request timed out",
    },
  },
  db: {
    pool: {
      error: "D1 query failed",
    },
  },
  fares: {
    pulled: "Pulled fares from the Israel Railways API into KV",
    pullFailed: "Failed to pull fares from the Israel Railways API",
    readFailed: "Failed to read the fares snapshot from KV",
    notAvailable: "No fares snapshot in KV — run the fares pull",
  },
  platforms: {
    writeFailed: "Failed to record SIRI-observed platforms",
  },
  siri: {
    started: "SIRI poller started",
    disabled: "SIRI poller disabled (SIRI_URL / SIRI_KEY not set)",
    pollFailed: "SIRI poll cycle failed",
    outage: "SIRI poller keeps failing — live data is stale",
    recovered: "SIRI poller recovered",
    notAuthorized: "SIRI API key is not authorized — check the egress IP allow-list",
    badStop: "SIRI rejected a stop code; evicting it for this feed",
    unmatchedJourneys: "SIRI journeys didn't match any GTFS trip",
    feedSwap: "SIRI poller reloaded stop codes for a new active feed",
    emptyStopCodes: "No stop codes available for SIRI monitoring in the active feed",
    snapshotReadFailed: "Failed to read the SIRI snapshot",
    snapshotWriteFailed: "Failed to write the SIRI snapshot",
  },
  serviceStatus: {
    failed: "Failed to compute service status",
    started: "Service-status gatherer started",
    disabled: "Service-status gatherer idle (RAIL_URL / RAIL_API_KEY not set)",
  },
  stationDepartures: {
    failed: "Failed to compute a station's departures",
  },
  stationInfo: {
    fetchFailed: "Failed to fetch a station's page from the Israel Railways API",
    cacheReadFailed: "Failed to read a station's page from KV",
    cacheWriteFailed: "Failed to write a station's page to KV",
  },
  announcements: {
    started: "Announcements poller started",
    skipped: "Announcements poll skipped (ANTHROPIC_API_KEY not set)",
    disabled: "Announcements poller idle (ANTHROPIC_API_KEY / RAIL_URL / RAIL_API_KEY not set)",
    fetchFailed: "Failed to fetch Israel Railways service updates",
    extractFailed: "Failed to extract disruptions from Israel Railways service updates",
    extracted: "Extracted disruptions from Israel Railways service updates",
    unchanged: "Israel Railways service updates unchanged since the last extraction",
    dropped: "Dropped an extracted disruption that does not fit the line catalogue",
    linesUnnamed: "An extracted disruption named no line that runs its stations; applying it to every line through them",
    recovered: "Announcements poller recovered",
    readFailed: "Failed to read the announcements state",
    writeFailed: "Failed to write the announcements state",
  },
  timetableCheck: {
    started: "Timetable check started",
    disabled: "Timetable check idle (RAIL_URL / RAIL_API_KEY not set)",
    failed: "Timetable check cycle failed",
    recovered: "Timetable check recovered",
    checked: "Compared Israel Railways' timetable with the schedule",
    requestFailed: "A timetable search failed; its trains were not checked",
    distrusted: "Too many trains missing from a timetable search; not trusting it",
    readFailed: "Failed to read the timetable check",
    writeFailed: "Failed to write the timetable check",
  },
  gtfs: {
    noActiveFeed: "No active GTFS feed in the database",
    feedExpiring: "Active GTFS feed is within 2 days of its validity end date",
    unmappedStation: "GTFS rail stop has no station mapping",
    search: {
      failed: "Failed to run GTFS timetable search",
    },
    ingest: {
      start: "Started GTFS ingest",
      unchanged: "GTFS feed unchanged since last ingest (checksum match)",
      loaded: "Loaded new GTFS feed",
      swapped: "Activated new GTFS feed",
      failed: "GTFS ingest failed",
      mappingDrift: "Station mapping drifted from the committed baseline",
      mappingIncomplete: "Station mapping is incomplete; keeping previous feed",
    },
  },
}
