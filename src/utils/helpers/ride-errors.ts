import axios from "axios"

export type RideStartStage = "push_token" | "api" | "notification" | "live_activity"

export type RideStartServerReason = "route_not_found" | "ride_in_past" | "ride_in_future" | "internal_error"

export class RideStartError extends Error {
  readonly stage: RideStartStage
  readonly status?: number
  readonly serverReason?: string

  constructor(stage: RideStartStage, message: string, options: { cause?: unknown; status?: number; serverReason?: string } = {}) {
    super(message)
    this.name = "RideStartError"
    this.stage = stage
    this.status = options.status
    this.serverReason = options.serverReason
    if (options.cause !== undefined) this.cause = options.cause
  }
}

// Axios throws the same way for a network failure and for a 4xx/5xx, so pull the status and the server's reason out here.
export function toRideApiError(error: unknown): RideStartError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const serverReason = typeof error.response?.data?.reason === "string" ? error.response.data.reason : undefined
    const detail = serverReason ?? (status ? `HTTP ${status}` : error.code || "network error")
    return new RideStartError("api", `Couldn't start ride: ${detail}`, { cause: error, status, serverReason })
  }

  if (error instanceof RideStartError) return error

  return new RideStartError("api", "Couldn't start ride", { cause: error })
}

// Sentry tags have to be strings, and all three are always set so a missing tag can never hide an event from a filter.
export function rideStartErrorTags(error: unknown) {
  const rideError = error instanceof RideStartError ? error : undefined

  return {
    ride_start_stage: rideError?.stage ?? "unknown",
    ride_start_status: rideError?.status ? String(rideError.status) : "none",
    ride_start_reason: rideError?.serverReason ?? "none",
  }
}

const BENIGN_SERVER_REASONS: RideStartServerReason[] = ["ride_in_past", "ride_in_future"]

// The user was offline, or the train already left / is still too far away. Worth counting, but nothing we can fix in code.
export function rideStartErrorLevel(error: unknown): "warning" | "error" {
  if (!(error instanceof RideStartError)) return "error"
  if (BENIGN_SERVER_REASONS.includes(error.serverReason as RideStartServerReason)) return "warning"
  if (error.stage === "api" && error.status === undefined) return "warning"

  return "error"
}
