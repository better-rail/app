import axios, { AxiosInstance } from "axios"
import { RouteItem } from "./rail-api.types"
import { userLocale } from "@/i18n"
import { head, last } from "lodash"
import { RideStartError, toRideApiError } from "@/utils/helpers/ride-errors"
import { serverBaseURL } from "@/config/api-config"

export class RideApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: serverBaseURL,
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
        viaStationId: route.viaStationId ? Number(route.viaStationId) : undefined,
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
