import { create, ApiResponse } from "apisauce"
import { AnnouncementApiResult } from "./api.types"

const api = create({
  baseURL: "https://israelrail.azurefd.net/rjpa-prod/api/v1/timetable/",
  headers: { "Ocp-Apim-Subscription-Key": "4b0d355121fe4e0bb3d86e902efe9f20" },
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
