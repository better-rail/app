import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { format } from "date-fns"
import { RequestBarodeParams } from "./api.types"

export class VoucherApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async requestToken(userId: string, phoneNumber: string) {
    try {
      const response = await this.api.apisauce.post(
        `/taarif//_layouts/15/SolBox.Rail.FastSale/ReservedPlaceHandler.ashx?mobile=${phoneNumber}&userId=${userId}&method=getToken&type=sms HTTP/`,
      )

      if (response.data === true) {
        return { success: true }
      }

      return { success: false }
    } catch (err) {
      console.error(err)
    }
  }

  requestBarcode({ userId, phoneNumber, token, route }: RequestBarodeParams) {
    // Format data for the voucher api
    const train = route.trains[0]

    const TrainDate = format(route.departureTime, "dd/MM/yyyy 00:00:00")
    const departureTime = format(train.departureTime, "dd/MM/yyyy HH:mm:ss")
    const arrivalTime = format(train.arrivalTime, "dd/MM/yyyy HH:mm:ss")

    const body = {
      smartcard: userId,
      mobile: phoneNumber,
      email: "",
      trainsResult: [
        {
          TrainDate,
          destinationStationId: "54",
          destinationStationHe: "",
          orignStationId: "23",
          orignStationHe: "",
          trainNumber: train.trainNumber,
          departureTime,
          arrivalTime,
          orignStation: train.originStationName,
          destinationStation: train.destinationStationName,
          orignStationNum: train.originStationId,
          destinationStationNum: train.destinationStationId,
          DestPlatform: train.destinationPlatform,
          TrainOrder: 1,
        },
      ],
    }
  }
}
