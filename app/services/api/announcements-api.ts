import { create, ApiResponse } from "apisauce"
import { AnnouncementApiResult } from "./api.types"

const api = create({
  baseURL: "https://www.rail.co.il/",
  headers: { Accept: "application/json;odata=verbose" },
})

export async function getAnnouncements() {
  try {
    const response: ApiResponse<AnnouncementApiResult> = await api.get(`/apiinfo/api/Info/GeneralUpdates?id=-1`)

    const { data } = response.data

    return data
  } catch (err) {
    console.error(err)
  }
}
