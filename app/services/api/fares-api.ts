import { create, ApiResponse } from "apisauce"
import { Api } from "./api"
import { FareApiResult } from "./api.types"

const api = create({
  baseURL: "https://www.rail.co.il/",
  headers: { Accept: "application/json;odata=verbose" },
})

export async function getRouteFare(originId: string, destinationId: string, profileCode: number) {
  try {
    const response: ApiResponse<FareApiResult> = await api.get(
      `/apiinfo/api/taarif/GetTariffTrip?VersionId=70&Profile_Code=${profileCode}&ETT_Codes=10&Station_Origin_Code=${originId}&Station_Destination_Code=${destinationId}`,
    )

    const { Results: responseData } = response.data
    const contract = responseData[0].ContractsResults[0]
    console.log(contract)
    if (contract.ETT_Code === 10) {
      return contract.Price
    }

    throw new Error("The EET Code (profile type) is invalid")
  } catch (err) {
    console.error(err)
  }
}
