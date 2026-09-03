import { Request, Response } from "express"
import { logNames, logger } from "../logs"
import { searchTrain, ScheduleType } from "../requests/gtfs-route-api"

const toScheduleType = (value: unknown): ScheduleType =>
  value === "ByArrival" || value === 2 || value === "2" ? "ByArrival" : "ByDeparture"

const toFlag = (value: unknown): boolean => value === true || value === "true" || value === 1 || value === "1"

// Run a GTFS-backed timetable search and reply with the emulated
// `{ result: { travels } }` shape the Israel Railways API used to return.
// `hideSlowTrains` is the app's "hide slow trains" toggle; absent (widgets, old
// clients) every direct train is listed.
const runTimetableSearch = async (
  res: Response,
  params: {
    fromStation: unknown
    toStation: unknown
    date: unknown
    hour: unknown
    scheduleType: unknown
    hideSlowTrains?: unknown
  },
) => {
  try {
    const result = await searchTrain(
      Number(params.fromStation),
      Number(params.toStation),
      String(params.date),
      String(params.hour),
      toScheduleType(params.scheduleType),
      { hideSlowTrains: toFlag(params.hideSlowTrains) },
    )
    res.status(200).json(result)
  } catch (error: any) {
    logger?.error(logNames.gtfs.search.failed, { error })
    res.status(500).json({ error: "Failed to fetch rail data", message: error.message })
  }
}

// Legacy GET `…/timetable/searchTrainLuzForDateTime` (old clients) — now served
// from GTFS. scheduleType arrives as "1" (ByDeparture) / "2" (ByArrival).
const handleSearchTrainRequest = async (req: Request, res: Response) => {
  const { fromStation, toStation, date, hour, scheduleType, hideSlowTrains } = req.query
  await runTimetableSearch(res, {
    fromStation,
    toStation,
    date,
    hour,
    scheduleType: scheduleType === "1" ? "ByDeparture" : "ByArrival",
    hideSlowTrains,
  })
}

const isTimetableSearchPath = (path: string) =>
  path.endsWith("/timetable/searchTrainForMobile") || path.endsWith("/timetable/searchTrain")

// The response envelope the Israel Railways API wrapped every payload in.
// Retired endpoints keep answering with it (empty) so shipped clients render
// "no data" instead of erroring.
const legacyEnvelope = (result: unknown) => ({
  creationDate: new Date().toISOString(),
  version: "1",
  successStatus: 1,
  statusCode: 200,
  errorMessages: null,
  result,
})

/**
 * `/rail-api/*` — the legacy Israel Railways API surface, now fully served
 * in-house. The timetable search endpoints run on GTFS/Postgres; everything
 * else (railupdates, PopUpMessages, station info) is retired — the upstream
 * proxy is gone — and answers with an empty legacy envelope.
 */
const handleRailApiRequest = async (req: Request, res: Response) => {
  if (req.method === "POST" && isTimetableSearchPath(req.path)) {
    const { fromStation, toStation, date, hour, scheduleType, hideSlowTrains } = req.body ?? {}
    await runTimetableSearch(res, { fromStation, toStation, date, hour, scheduleType, hideSlowTrains })
    return
  }

  // Station info is an object result in shipped clients (its screen crashes on
  // an array), so it gets null; the list endpoints get [].
  const result = req.path.includes("/Stations/GetStationInformation") ? null : []
  res.status(200).json(legacyEnvelope(result))
}

export { handleRailApiRequest, handleSearchTrainRequest }
