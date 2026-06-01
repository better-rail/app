import { Request, Response } from "express"
import { railUrl, railApiKey } from "../data/config"

// Custom handler for the transformed search train request
const handleSearchTrainRequest = async (req: Request, res: Response) => {
  try {
    // Extract parameters from query string
    const { fromStation, toStation, date, hour, scheduleType, systemType, languageId } = req.query

    // Create the new POST request body
    const requestBody = {
      methodName: "searchTrainLuzForDateTime",
      fromStation: parseInt(fromStation as string),
      toStation: parseInt(toStation as string),
      date: date as string,
      hour: hour as string,
      systemType: systemType as string,
      scheduleType: scheduleType === "1" ? "ByDeparture" : "ByArrival",
      languageId: languageId as string,
      requestLocation: '{"latitude":"0.0","longitude":"0.0"}',
      requestIP: req.ip || "147.236.228.2",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      screenResolution: '{"height":874,"width":402}',
      searchFromFavorites: false,
    }

    // Make the POST request to the rail API
    const response = await fetch(`${railUrl}/rjpa/api/v1/timetable/searchTrainForMobile`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": railApiKey,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch rail data",
      message: error.message,
    })
  }
}

const railProxy = async (req: Request, res: Response) => {
  try {
    // Older app versions call the legacy `searchTrain` endpoint directly, then fall
    // back to this proxy when it returns 403 (it's now blocked by Cloudflare's WAF).
    // Transparently rewrite that path to the `searchTrainForMobile` endpoint so
    // already-released clients keep working. Exact match only — a substring replace
    // would turn `searchTrainForMobile` into `searchTrainForMobileForMobile`.
    const path =
      req.path === "/rjpa/api/v1/timetable/searchTrain"
        ? "/rjpa/api/v1/timetable/searchTrainForMobile"
        : req.path

    // Preserve the query string — the GET endpoints (railupdates, station info)
    // depend on `LanguageId`/`SystemType` params, and an old client routes every
    // request through here once it has fallen back to the proxy.
    const queryIndex = req.url.indexOf("?")
    const search = queryIndex === -1 ? "" : req.url.slice(queryIndex)

    const url = `${railUrl}${path}${search}`
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        "Ocp-Apim-Subscription-Key": railApiKey,
        Accept: "application/json",
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch rail data",
      message: error.message,
    })
  }
}

export { railProxy, handleSearchTrainRequest }
