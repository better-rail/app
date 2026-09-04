import axios, { AxiosInstance } from "axios"
import { RouteItem } from "./rail-api.types"
import { userLocale } from "@/i18n"
import { head, last } from "lodash"
import { RideStartError, toRideApiError } from "@/utils/helpers/ride-errors"

export class RideApi {
  axiosInstance: AxiosInstance

  constructor() {
    const env: string = "production"
    const envPath = env === "production" ? "" : "-" + env
    let baseURL = "https://api.better-rail.co.il/api/v1"

    if (env !== "production") {
      baseURL = `https://better-rail${envPath}.up.railway.app/api/v1`
    }

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  // Throws a RideStartError holding the HTTP status and the server's reason, so the caller can report why it failed.
  async startRide(route: RouteItem, token: string): Promise<string> {
    let response

    try {
      response = await this.axiosInstance.post("/ride", {
        token,
        provider: "android",
        locale: userLocale,
        departureDate: route.departureTimeString,
        originId: head(route.trains).originStationId,
        destinationId: last(route.trains).destinationStationId,
        trains: route.trains.map((train) => train.trainNumber),
      })
    } catch (error) {
      throw toRideApiError(error)
    }

    if (!response.data?.success || !response.data?.rideId) {
      throw new RideStartError("api", "Couldn't start ride: server reported failure", {
        status: response.status,
        serverReason: typeof response.data?.reason === "string" ? response.data.reason : undefined,
      })
    }

    return response.data.rideId
  }

  async endRide(rideId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.delete("/ride", {
        data: {
          rideId,
        },
      })

      return response.data?.success
    } catch {
      return false
    }
  }

  async updateRideToken(rideId: string, token: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.patch("/ride/updateToken", {
        rideId,
        token,
      })

      return response.data?.success
    } catch {
      return false
    }
  }
}
