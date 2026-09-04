export const logNames = {
  server: {
    listening: "App listening",
  },
  redis: {
    connect: {
      success: "Connected to redis",
      failed: "Couldn't connect to redis",
    },
    rides: {
      get: {
        success: "Got ride from redis",
        failed: "Failed to get ride from redis",
      },
      getAll: {
        success: "Got all rides from redis",
        failed: "Failed to get all rides from redis",
      },
      add: {
        success: "Added ride to redis",
        failed: "Failed to add ride to redis",
      },
      delete: {
        success: "Deleted ride from redis",
        failed: "Failed to delete ride from redis",
      },
      updateNotificationId: {
        success: "Updated last notification id in redis",
        failed: "Failed to update last notification id in redis",
      },
      updateToken: {
        success: "Updated token for ride in redis",
        failed: "Failed to update token for ride in redis",
      },
    },
  },
  scheduler: {
    scheduleExisting: "Scheduled existing rides from redis",
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
  },
  notifications: {
    log: "Got notification",
    apple: {
      success: "Sent notification to APN successully!",
      failed: "Failed to send notificaiton to APN",
    },
    android: {
      success: "Sent notification to FCM successully!",
      failed: "Failed to send notificaiton to FCM",
    },
  },
  routeApi: {
    getRoutes: {
      success: "Got route successfully",
      failed: "Failed to get route",
    },
  },
  db: {
    pool: {
      error: "Postgres pool error",
    },
  },
  platforms: {
    writeFailed: "Failed to record SIRI-observed platforms",
  },
  siri: {
    started: "SIRI poller started",
    disabled: "SIRI poller disabled (SIRI_URL / SIRI_KEY not set)",
    pollFailed: "SIRI poll cycle failed",
    recovered: "SIRI poller recovered",
    notAuthorized: "SIRI API key is not authorized — check the egress IP allow-list",
    badStop: "SIRI rejected a stop code; evicting it for this feed",
    unmatchedJourneys: "SIRI journeys didn't match any GTFS trip",
    feedSwap: "SIRI poller reloaded stop codes for a new active feed",
    emptyStopCodes: "No stop codes available for SIRI monitoring in the active feed",
    snapshotReadFailed: "Failed to read the SIRI snapshot from redis",
    snapshotWriteFailed: "Failed to write the SIRI snapshot to redis",
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
