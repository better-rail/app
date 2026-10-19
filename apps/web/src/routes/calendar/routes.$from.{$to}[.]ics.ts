import { createFileRoute } from "@tanstack/react-router"
import { getStationById } from "@/data/stations"
import { buildIcs, tripCalendarEvent, tripPagePath, type CalendarTrip } from "@/lib/calendar"
import { parseNaive } from "@/lib/time"

/**
 * A journey's calendar entry as a file at a URL, for phones: iOS opens a `text/calendar` response straight into
 * Calendar's "add event" sheet, where a downloaded blob would only land in Files. Everything the event needs rides on
 * the link (see `tripCalendarFilePath`), so serving it never touches the timetable API.
 */

const TRIP_ID = /^\d+(-\d+)*$/
const LINK_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/
const MAX_TRIP_MS = 12 * 3600_000

export const Route = createFileRoute("/calendar/routes/$from/{$to}.ics")({
  server: {
    handlers: {
      GET: ({ params, request }) => {
        const origin = getStationById(params.from)
        const destination = getStationById(params.to)
        const url = new URL(request.url)
        const search = url.searchParams
        const tripId = search.get("trip") ?? ""
        const dep = search.get("dep") ?? ""
        const arr = search.get("arr") ?? ""
        if (!origin || !destination || origin.id === destination.id) return new Response("Not found", { status: 404 })
        if (!TRIP_ID.test(tripId) || !LINK_TIME.test(dep) || !LINK_TIME.test(arr)) {
          return new Response("Bad request", { status: 400 })
        }
        const departureTime = parseNaive(dep)
        const arrivalTime = parseNaive(arr)
        if (!(arrivalTime > departureTime && arrivalTime - departureTime <= MAX_TRIP_MS)) {
          return new Response("Bad request", { status: 400 })
        }

        const trip: CalendarTrip = {
          originId: origin.id,
          destinationId: destination.id,
          locale: search.get("lang") === "en" ? "en" : "he",
          route: { id: tripId, departureTime, arrivalTime },
        }
        const ics = buildIcs(tripCalendarEvent(trip, new URL(tripPagePath(trip), url.origin).toString()))
        return new Response(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="better-rail-${dep.slice(11).replace(":", "")}.ics"`,
            "Cache-Control": "public, max-age=86400",
          },
        })
      },
    },
  },
})
