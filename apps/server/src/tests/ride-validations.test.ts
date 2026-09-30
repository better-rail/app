import { DeleteRideBody, UpdateRideTokenBody } from "../routes/validations"
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
})
