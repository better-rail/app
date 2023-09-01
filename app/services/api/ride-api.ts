import axios, { AxiosInstance } from "axios"
import { RouteItem } from "./rail-api.types"
import { userLocale } from "../../i18n"
import { head, last } from "lodash"

export class RideApi {
  axiosInstance: AxiosInstance

  constructor() {
    const env: string = "production"
    const envPath = env === "production" ? "" : "-" + env
    const baseURL = `https://better-rail${envPath}.up.railway.app/api/v1`

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }

  async startRide(route: RouteItem, token: string): Promise<string | null> {
    try {
      const response = await this.axiosInstance.post("/ride", {
        token,
        provider: "android",
        locale: userLocale,
        departureDate: route.departureTimeString,
        originId: head(route.trains).originStationId,
        destinationId: last(route.trains).destinationStationId,
        trains: route.trains.map((train) => train.trainNumber),
      })
      return response.data?.success ? response.data?.rideId : null
    } catch (err) {
      throw err
    }
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
