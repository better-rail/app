// Returned to the client alongside `success: false`, so it can tag its report with the cause.
export type RideFailureReason = "route_not_found" | "ride_in_past" | "ride_in_future" | "internal_error"

export class RideNotInTimeError extends Error {
  constructor(
    message: string,
    readonly reason: Extract<RideFailureReason, "ride_in_past" | "ride_in_future">,
  ) {
    super(message)
    this.name = "RideNotInTimeError"
  }
}

export class NotFoundRouteForRide extends Error {
  readonly reason: RideFailureReason = "route_not_found"

  constructor(message: string) {
    super(message)
    this.name = "NotFoundRouteForRide"
  }
}

export const rideFailureReason = (error: unknown): RideFailureReason => {
  if (error instanceof RideNotInTimeError || error instanceof NotFoundRouteForRide) return error.reason
  return "internal_error"
}
