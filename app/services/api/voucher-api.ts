import { ApiResponse } from "apisauce"
import { Api } from "./api"

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
}
