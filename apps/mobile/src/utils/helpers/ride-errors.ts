import axios from "axios"

export type RideStartStage = "push_token" | "api" | "notification" | "live_activity" | "unsupported"

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

// The iOS native start (RNBetterRail.startActivity) rejects with a code naming the failed step.
// Map it onto the stages Android reports, so an offline start or a ride in the past isn't counted as an app bug.
export function toLiveActivityError(error: unknown): RideStartError {
  const { code, userInfo } = (error ?? {}) as { code?: unknown; userInfo?: Record<string, unknown> }

  switch (code) {
    case "no_response": {
      const urlErrorCode = userInfo?.urlErrorCode
      const detail = typeof urlErrorCode === "number" ? `URL error ${urlErrorCode}` : "no response"
      return new RideStartError("api", `Couldn't start ride: ${detail}`, { cause: error })
    }
    case "server_rejected": {
      const status = typeof userInfo?.status === "number" && userInfo.status > 0 ? userInfo.status : undefined
      const serverReason = typeof userInfo?.reason === "string" ? userInfo.reason : undefined
      const detail = serverReason ?? (status ? `HTTP ${status}` : "server reported failure")
      return new RideStartError("api", `Couldn't start ride: ${detail}`, { cause: error, status, serverReason })
    }
    case "push_token_timeout":
      return new RideStartError("push_token", "Timed out waiting for the live activity push token", { cause: error })
    case "activities_disabled":
      return new RideStartError("unsupported", "Live Activities are turned off", { cause: error })
    default: {
      const detail = typeof code === "string" ? ` (${code})` : ""
      return new RideStartError("live_activity", `Couldn't start the live activity${detail}`, { cause: error })
    }
  }
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
  if (error.stage === "unsupported") return "warning"
  if (BENIGN_SERVER_REASONS.includes(error.serverReason as RideStartServerReason)) return "warning"
  if (error.stage === "api" && error.status === undefined) return "warning"

  return "error"
}
