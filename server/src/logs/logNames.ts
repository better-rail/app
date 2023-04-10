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
        failed: "Failed to Update last notification id in redis",
      },
    },
  },
  scheduler: {
    scheduleExisting: "Scheduled existing rides from redis",
    rideInPast: "The requested ride is in the past, it'll be deleted",
    registerRide: {
      success: "Scheduled notifications for ride",
      failed: "Failed to register notifications for ride",
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
  },
  notifications: {
    log: "Got notification",
    apple: {
      success: "Sent notification to APN successully!",
      failed: "Failed to send notificaiton to APN",
    },
  },
  routeApi: {
    getRoutes: {
      success: "Got route successfully",
      failed: "Failed to get route",
    },
  },
}