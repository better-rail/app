import { describe, it, expect, beforeEach } from "bun:test"
import { LiveRideController } from "./live-ride-controller"
import { extractFcmData } from "./fcm-payload"
import type { AndroidAlert, LiveRideNativeBridge, LiveRideUpdatePayload } from "./types"
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
    expect(bridge.cancelled).toBe(true)
    expect(storedRoute).toBeNull()
    expect(bridge.alerts.length).toBe(0)
    expect(bridge.updates.length).toBe(1)
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

  // The fixture has train 100 (1 -> 10, 11 -> 2) and train 200 (2 -> 20 -> 3): 3 + 2 legs, transfer after leg 3
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
