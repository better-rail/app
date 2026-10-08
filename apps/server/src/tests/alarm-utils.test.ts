import { minutesInMs } from "./helpers/utils"
import { RideAlarm } from "../types/ride"
import { partiallyMock } from "./helpers/types"
import { LanguageCode } from "../locales/i18n"
import { RouteItem } from "../types/rail"
import { buildAlarmMovedTexts, buildAndroidAlarmMessage, getAlarmFireDate, getAlarmMove } from "../utils/alarm-utils"

// 2026-10-05 08:30 in Israel
const arrivalTime = Date.UTC(2026, 9, 5, 5, 30)
const now = arrivalTime - minutesInMs(40)

const routeWithDelay = (delays: number[]) =>
  partiallyMock<RouteItem>({
    delay: delays[0],
    arrivalTime,
    trains: delays.map((delay, index) => ({
      delay,
      arrivalTime: index === delays.length - 1 ? arrivalTime : arrivalTime - minutesInMs(30),
      destinationStationId: 3700,
    })),
  })

const alarm = (fireDate: number): RideAlarm => ({
  token: "device-token",
  alarmId: "6f1c7a52-58f1-4b47-9c55-6c1d5d1d2a11",
  leadMinutes: 7,
  locale: LanguageCode.en,
  fireDate,
})

describe("arrival alarm", () => {
  it("rings the lead time before the delayed arrival of the last train", () => {
    expect(getAlarmFireDate(routeWithDelay([2, 5]), 7)).toBe(arrivalTime + minutesInMs(5 - 7))
  })

  it("moves when the delay grows or shrinks", () => {
    const scheduled = arrivalTime - minutesInMs(7)
    expect(getAlarmMove(alarm(scheduled), routeWithDelay([4]), now)).toBe(arrivalTime - minutesInMs(3))
    expect(getAlarmMove(alarm(scheduled + minutesInMs(10)), routeWithDelay([0]), now)).toBe(scheduled)
  })

  it("stays put for moves under a minute", () => {
    const scheduled = arrivalTime - minutesInMs(7)
    expect(getAlarmMove(alarm(scheduled + 30 * 1000), routeWithDelay([0]), now)).toBeUndefined()
  })

  it("doesn't move an alarm that already rang", () => {
    expect(getAlarmMove(alarm(now - 1000), routeWithDelay([10]), now)).toBeUndefined()
  })

  it("formats the new time in Israel's time zone", () => {
    const texts = buildAlarmMovedTexts(alarm(0), routeWithDelay([6]), arrivalTime - minutesInMs(1))
    expect(texts.title).toBe("Alarm moved to 08:29")
    expect(texts.body).toBe("It will ring 7 minutes before arriving at Tel Aviv - Savidor Center.")
  })

  it("sends Android a data-only message that expires when the alarm rings", () => {
    const fireDate = arrivalTime - minutesInMs(3)
    const texts = buildAlarmMovedTexts(alarm(0), routeWithDelay([4]), fireDate)
    const message = buildAndroidAlarmMessage("ride-1", alarm(0), texts, fireDate, now)

    expect(message).toMatchObject({
      token: "device-token",
      data: {
        type: "arrival-alarm",
        rideId: "ride-1",
        alarmId: alarm(0).alarmId,
        fireDate: String(fireDate / 1000),
        title: texts.title,
      },
      android: { priority: "high", collapseKey: "arrival-alarm-ride-1", ttl: fireDate - now },
    })
    expect(message).not.toHaveProperty("notification")
    expect(Object.values(message.data!).every((value) => typeof value === "string")).toBe(true)
  })
})
