import { DeleteRideBody, SetRideAlarmBody, UpdateRideTokenBody } from "../routes/validations"
import { RideRequestSchema, RideSchema } from "../types/ride"

describe("ride validation", () => {
  it("rejects empty device tokens", () => {
    expect(RideRequestSchema.shape.token.safeParse("").success).toBe(false)
    expect(UpdateRideTokenBody.safeParse({ rideId: "ride-id", token: "" }).success).toBe(false)
  })

  it("rejects empty ride ids", () => {
    expect(RideSchema.shape.rideId.safeParse("").success).toBe(false)
    expect(UpdateRideTokenBody.safeParse({ rideId: "", token: "device-token" }).success).toBe(false)
    expect(DeleteRideBody.safeParse({ rideId: "" }).success).toBe(false)
  })

  it("accepts only sane arrival alarms", () => {
    const alarm = { rideId: "ride-id", token: "device-token", alarmId: crypto.randomUUID(), leadMinutes: 7, locale: "he" }
    expect(SetRideAlarmBody.safeParse(alarm).success).toBe(true)
    expect(SetRideAlarmBody.safeParse({ ...alarm, leadMinutes: 90 }).success).toBe(false)
    expect(SetRideAlarmBody.safeParse({ ...alarm, alarmId: "not-a-uuid" }).success).toBe(false)
  })
})
