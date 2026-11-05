import { describe, it, expect, beforeEach } from "bun:test"
import { LiveRideController, STALE_AFTER_MS, formatArrivingIn, formatDepartsIn, formatHours } from "./live-ride-controller"
import { extractFcmData } from "./fcm-payload"
import type { AndroidAlert, LiveRideNativeBridge, LiveRideUpdatePayload } from "./types"
import { SemanticColor } from "./types"
import type { RouteItem, Train } from "@/services/api/rail-api.types"
import { buildRoute, MINUTE } from "../../../test/fixtures/ride-route"

class FakeNativeBridge implements LiveRideNativeBridge {
  updates: LiveRideUpdatePayload[] = []
  alerts: AndroidAlert[] = []
  cancelled = false
  canPromote: boolean | undefined = true
  canAlarm = true

  async updateLiveRide(payload: LiveRideUpdatePayload): Promise<boolean> {
    this.updates.push(payload)
    return true
  }

  async cancelLiveRide(): Promise<boolean> {
    this.cancelled = true
    return true
  }

  async canPostPromoted(): Promise<boolean | undefined> {
    return this.canPromote
  }

  async canScheduleExactAlarms(): Promise<boolean> {
    return this.canAlarm
  }

  async postAlert(alert: AndroidAlert): Promise<boolean> {
    this.alerts.push(alert)
    return true
  }
}

describe("LiveRideController", () => {
  let bridge: FakeNativeBridge
  let storedRoute: RouteItem | null = null
  let notificationsGranted = true
  let controller: LiveRideController

  beforeEach(() => {
    bridge = new FakeNativeBridge()
    storedRoute = null
    notificationsGranted = true

    controller = new LiveRideController({
      bridge,
      storage: {
        getRoute: async () => storedRoute,
        saveRoute: async (r) => {
          storedRoute = r
        },
        clear: async () => {
          storedRoute = null
        },
      },
      getNotificationsGranted: async () => notificationsGranted,
    })
  })

  it("starts a ride and sends initial progress with precomputed stale fallback to bridge", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    expect(storedRoute).toEqual(route)
    expect(bridge.updates.length).toBe(1)

    const initial = bridge.updates[0]
    expect(initial.isArrived).toBe(false)
    expect(initial.currentStop).toBe(0)
    expect(initial.totalStops).toBeGreaterThanOrEqual(1)
    expect(initial.staleAfterMs).toBe(STALE_AFTER_MS)
    expect(initial.stale).toBeDefined()
    expect(initial.stale?.body).toContain("ride.connectionIssues")
    expect(initial.body).toContain("ride.trainInfo")
    expect(initial.title).toContain("ride.departsIn")
    expect(initial.stopActionText).toContain("ride.stopRide")
    expect(initial.stale?.stopActionText).toContain("ride.stopRide")
  })

  it("aligns start ride / loading text to train info and departure countdown", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    await controller.processIncomingPush({
      type: "live-ride",
      status: "loading",
      delay: "0",
      nextStationId: "10",
    })

    const loadingUpdate = bridge.updates[1]
    expect(loadingUpdate.body).toContain("ride.trainInfo")
    expect(loadingUpdate.title).toContain("ride.departsIn")
  })

  it("processes incoming FCM push, advances progress, and updates stale deadline", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    const fcmData = {
      type: "live-ride",
      status: "inTransit",
      delay: "3",
      nextStationId: "11",
    }

    await controller.processIncomingPush(fcmData)

    expect(bridge.updates.length).toBe(2)
    const update = bridge.updates[1]
    expect(update.currentStop).toBe(1)
    expect(update.stale).toBeDefined()
    expect(update.stale?.untilMs).toBeGreaterThan(Date.now())
  })

  it("sends translated status bar chip text, prioritizing countdown over delay", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    expect(bridge.updates[0].shortCriticalText).toContain("ride.chipInMinutes")
    expect(bridge.updates[0].stale?.shortCriticalText).toContain("ride.chipNoSignal")

    await controller.processIncomingPush({ type: "live-ride", status: "inTransit", delay: "3", nextStationId: "11" })
    expect(bridge.updates[1].shortCriticalText).toContain("ride.chipInMinutes")

    const longRoute = buildRoute(90 * MINUTE)
    await controller.start(longRoute)
    expect(bridge.updates[2].shortCriticalText).toContain("ride.chipInHoursAndMinutes")
  })

  it("folds milestone alerts into the live ride notification without double-posting an alert", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    const fcmData = {
      type: "live-ride",
      status: "inTransit",
      delay: "0",
      nextStationId: "20",
      alert: JSON.stringify({
        id: "live-ride-alert-123",
        title: "Hop on board!",
        body: "Take the train from Platform 3",
      }),
    }

    await controller.processIncomingPush(fcmData)

    expect(bridge.alerts.length).toBe(0)
    expect(bridge.updates.length).toBe(2)

    const alertUpdate = bridge.updates[1]
    expect(alertUpdate.title).toBe("Hop on board!")
    expect(alertUpdate.body).toBe("Take the train from Platform 3")
    expect(alertUpdate.alertOnce).toBe(false)

    await controller.processIncomingPush({
      type: "live-ride",
      status: "inTransit",
      delay: "0",
      nextStationId: "20",
    })

    expect(bridge.updates.length).toBe(3)
    const nextUpdate = bridge.updates[2]
    expect(nextUpdate.title).toMatch(/Arriving in|ride\.arrivingIn/)
    expect(nextUpdate.alertOnce).toBe(true)
  })

  it("handles arrived status by marking isArrived and omitting stale fallback", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    await controller.processIncomingPush({
      type: "live-ride",
      status: "arrived",
      delay: "0",
      nextStationId: "3",
    })

    expect(bridge.updates.length).toBe(2)
    const arrivalUpdate = bridge.updates[1]
    expect(arrivalUpdate.isArrived).toBe(true)
    expect(arrivalUpdate.stale).toBeUndefined()
    expect(arrivalUpdate.stopActionText).toBeUndefined()
  })

  it("stops tracking, cancels on bridge, and cleans up stored state", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    await controller.stop()

    expect(bridge.cancelled).toBe(true)
    expect(storedRoute).toBeNull()
  })

  it("ignores server alerts and pushes if the ride has already been stopped", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)
    await controller.stop()

    const fcmData = {
      type: "live-ride",
      status: "inTransit",
      delay: "0",
      nextStationId: "20",
      alert: JSON.stringify({
        id: "live-ride-alert-123",
        title: "Get off soon",
        body: "Tel Aviv Savidor Center is next",
      }),
    }

    await controller.processIncomingPush(fcmData)
    expect(bridge.alerts.length).toBe(0)
    expect(bridge.updates.length).toBe(1)
  })

  it("omits stale fallback gracefully when route has no arrival time", async () => {
    const base = buildRoute(10 * MINUTE)
    const route: RouteItem = {
      ...base,
      arrivalTime: undefined,
      trains: base.trains.map((t) => ({ ...t, arrivalTime: undefined }) as unknown as Train),
    } as unknown as RouteItem
    await controller.start(route)

    expect(bridge.updates[0].stale).toBeUndefined()
  })

  it("checks permissions via system notification status and bridge", async () => {
    notificationsGranted = true
    bridge.canPromote = true
    bridge.canAlarm = true

    const perms = await controller.checkPermissions()
    expect(perms.granted).toBe(true)
    expect(perms.canPromoteOngoing).toBe(true)
    expect(perms.canScheduleExactAlarms).toBe(true)

    notificationsGranted = false
    bridge.canPromote = false
    bridge.canAlarm = false

    const denied = await controller.checkPermissions()
    expect(denied.granted).toBe(false)
    expect(denied.canPromoteOngoing).toBe(false)
    expect(denied.canScheduleExactAlarms).toBe(false)

    bridge.canPromote = undefined
    const preBaklava = await controller.checkPermissions()
    expect(preBaklava.canPromoteOngoing).toBeUndefined()
  })

  it("requests permissions through the module interface", async () => {
    let requestCalled = false
    const permController = new LiveRideController({
      bridge,
      storage: {
        getRoute: async () => storedRoute,
        saveRoute: async () => {},
        clear: async () => {},
      },
      getNotificationsGranted: async () => true,
      requestNotifications: async () => {
        requestCalled = true
      },
    })

    const state = await permController.requestPermissions()
    expect(requestCalled).toBe(true)
    expect(state.granted).toBe(true)
  })

  it("calculates progress for direct routes with no intermediate stops and completes at 100%", async () => {
    const directTrain = {
      trainNumber: 500,
      originStationId: 100,
      destinationStationId: 200,
      departureTime: Date.now() - 5 * MINUTE,
      arrivalTime: Date.now() + 5 * MINUTE,
      stopStations: [],
      delay: 0,
    } as unknown as Train
    const directRoute: RouteItem = {
      departureTime: directTrain.departureTime,
      arrivalTime: directTrain.arrivalTime,
      trains: [directTrain],
    } as RouteItem

    await controller.start(directRoute)
    const initial = bridge.updates[0]
    expect(initial.totalStops).toBe(1)
    expect(initial.maxProgress).toBe(100)
    expect(initial.progress).toBeGreaterThanOrEqual(45)
    expect(initial.progress).toBeLessThanOrEqual(55)

    await controller.processIncomingPush({
      type: "live-ride",
      status: "getOff",
      delay: "0",
      nextStationId: "200",
    })
    const getOffUpdate = bridge.updates[1]
    expect(getOffUpdate.body).toBe("ride.getOff.test")
    expect(getOffUpdate.currentStop).toBe(1)
    expect(getOffUpdate.progress).toBe(100)
    expect(getOffUpdate.maxProgress).toBe(100)
    // The server re-sends the state every minute; only the push carrying the alert should buzz
    expect(getOffUpdate.alertOnce).toBe(true)

    await controller.processIncomingPush({
      type: "live-ride",
      status: "arrived",
      delay: "0",
      nextStationId: "200",
    })
    const arrivedUpdate = bridge.updates[2]
    expect(arrivedUpdate.currentStop).toBe(1)
    expect(arrivedUpdate.progress).toBe(100)
    expect(arrivedUpdate.maxProgress).toBe(100)
  })

  it("formats arrival and departure times into hours and minutes when duration >= 60 minutes", () => {
    expect(formatArrivingIn(98)).toBe("ride.arrivingInHoursAndMinutes.test")
    expect(formatArrivingIn(60)).toBe("ride.arrivingInHours.test")
    expect(formatArrivingIn(30)).toBe("ride.arrivingIn.test")
    expect(formatDepartsIn(98)).toBe("ride.departsInHoursAndMinutes.test")
    expect(formatDepartsIn(60)).toBe("ride.departsInHours.test")
    expect(formatDepartsIn(30)).toBe("ride.departsIn.test")
    expect(formatHours(1)).toBe("ride.hoursOne.test")
    expect(formatHours(2)).toBe("ride.hoursTwo.test")
    expect(formatHours(3)).toBe("ride.hoursCount.test")
  })

  it("colors only significant delays and connection issues", async () => {
    const route = buildRoute(10 * MINUTE)
    await controller.start(route)

    // On time: no color anywhere, and the stale fallback flags only the connection issue
    expect(bridge.updates[0].highlights).toEqual([])
    expect(bridge.updates[0].delayed).toBe(false)
    expect(bridge.updates[0].stale?.highlights).toEqual([{ text: "ride.connectionIssues.test", style: SemanticColor.CAUTION }])

    // A routine delay is mentioned but not colored
    await controller.processIncomingPush({ type: "live-ride", status: "inTransit", delay: "3", nextStationId: "11" })
    expect(bridge.updates[1].body).toContain("3 routes.delayTime.test")
    expect(bridge.updates[1].highlights).toEqual([])
    expect(bridge.updates[1].delayed).toBe(false)

    // A significant delay colors just its own fragment, and the track ahead
    await controller.processIncomingPush({ type: "live-ride", status: "inTransit", delay: "7", nextStationId: "11" })
    const delayed = bridge.updates[2]
    expect(delayed.highlights).toEqual([{ text: "7 routes.delayTime.test", style: SemanticColor.DANGER }])
    expect(delayed.body).toContain("7 routes.delayTime.test")
    expect(delayed.title).not.toContain("routes.delayTime")
    expect(delayed.delayed).toBe(true)
    expect(delayed.stale?.delayed).toBe(true)
  })

  // The fixture has train 100 (1 -> 10, 11 -> 2) and train 200 (2 -> 20 -> 3): 3 + 2 legs, transfer after leg 3
  it("shows the trip plan with the tracker at the start before boarding", async () => {
    await controller.start(buildRoute(10 * MINUTE))
    const waiting = bridge.updates[0]
    expect(waiting.totalStops).toBe(5)
    expect(waiting.progress).toBe(0)
    expect(waiting.maxProgress).toBe(500)
    expect(waiting.transferPoints).toEqual([300])
  })

  it("keeps the progress made so far while waiting at a transfer", async () => {
    // the first train reached the transfer 5 minutes ago; the next one leaves in 5
    await controller.start(buildRoute(-35 * MINUTE))
    await controller.processIncomingPush({ type: "live-ride", status: "inExchange", delay: "0", nextStationId: "2" })
    const exchange = bridge.updates[1]
    expect(exchange.totalStops).toBe(5)
    expect(exchange.progress).toBe(300)
    expect(exchange.transferPoints).toEqual([300])
  })

  it("fills the bar only up to the transfer when getting off the first train", async () => {
    await controller.start(buildRoute(-29 * MINUTE))
    await controller.processIncomingPush({ type: "live-ride", status: "getOff", delay: "0", nextStationId: "2" })
    expect(bridge.updates[1].progress).toBe(300)
  })

  it("places the tracker on the right train around a transfer", async () => {
    // 25 minutes in: on train 100's last leg (11 -> 2), heading to the transfer
    await controller.start(buildRoute(-25 * MINUTE))
    await controller.processIncomingPush({ type: "live-ride", status: "inTransit", delay: "0", nextStationId: "2" })
    expect(bridge.updates[1].progress).toBeGreaterThan(200)
    expect(bridge.updates[1].progress).toBeLessThan(300)

    // 45 minutes in: on train 200's first leg (2 -> 20)
    await controller.start(buildRoute(-45 * MINUTE))
    await controller.processIncomingPush({ type: "live-ride", status: "inTransit", delay: "0", nextStationId: "20" })
    expect(bridge.updates[3].progress).toBeGreaterThan(300)
    expect(bridge.updates[3].progress).toBeLessThan(400)
  })
})

describe("extractFcmData payload resilience", () => {
  const payload = { type: "live-ride", status: "inTransit", delay: "2", nextStationId: "10" }

  it("unwraps background task remoteMessage data", () => {
    const raw = {
      notification: {
        request: {
          trigger: {
            remoteMessage: {
              data: payload,
            },
          },
        },
      },
    }
    expect(extractFcmData(raw)).toEqual(payload)
  })

  it("unwraps foreground notification request content data", () => {
    const raw = {
      notification: {
        request: {
          content: {
            data: payload,
          },
        },
      },
    }
    expect(extractFcmData(raw)).toEqual(payload)
  })

  it("unwraps flat data wrappers", () => {
    expect(extractFcmData({ data: payload })).toEqual(payload)
    expect(extractFcmData(payload)).toEqual(payload)
  })

  it("returns null for non-push payloads", () => {
    expect(extractFcmData(null)).toBeNull()
    expect(extractFcmData({})).toBeNull()
    expect(extractFcmData({ foo: "bar" })).toBeNull()
  })
})
