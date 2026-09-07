import { createFileRoute } from "@tanstack/react-router"
import { getStationById } from "@/data/stations"
import { clientIpFrom, searchRoutes } from "@/lib/api/find-routes"
import { isValidDateKey } from "@/lib/time"
import { heroContent, tripFacts, type TripFacts } from "@/lib/route-seo"
import { renderHeroJpeg, stationPhotoDataUri } from "@/lib/og/render"

/**
 * The hero image a shared route link previews with (see `routesHead` in the routes page): the origin station's
 * photo captioned with the route, or — given the `date` and `trip` of a journey — with that journey's times.
 *
 * A journey's picture is fixed once it has run, so it is cached for a day; a route's for a week. The trip lookup
 * hits the timetable API, and a journey it cannot find (a stale link, an outage) falls back to the route's picture
 * rather than an error, so the link still previews.
 */

const TRIP_ID = /^\d+(-\d+)*$/

const cacheHeaders = (fresh: number, stale: number) => ({
  "Cache-Control": `public, max-age=${fresh}`,
  "CDN-Cache-Control": `public, s-maxage=${fresh}, stale-while-revalidate=${stale}`,
})

export const Route = createFileRoute("/og/routes/$from/{$to}.jpg")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const origin = getStationById(params.from)
        const destination = getStationById(params.to)
        if (!origin || !destination || origin.id === destination.id) return new Response("Not found", { status: 404 })

        const search = new URL(request.url).searchParams
        const locale = search.get("lang") === "en" ? "en" : "he"
        const date = search.get("date") ?? ""
        const tripId = search.get("trip") ?? ""

        let trip: TripFacts | null = null
        if (isValidDateKey(date) && TRIP_ID.test(tripId)) {
          try {
            const clientIp = clientIpFrom((name) => request.headers.get(name))
            const result = await searchRoutes(
              { originId: origin.id, destinationId: destination.id, date, hour: "12:00" },
              clientIp,
            )
            const route = result.routes.find((candidate) => candidate.id === tripId)
            if (route) trip = tripFacts(route, date)
          } catch {
            // The route's picture still previews the link.
          }
        }

        const photo = await stationPhotoDataUri(origin, request)
        const jpeg = await renderHeroJpeg(heroContent({ locale, origin, destination, trip, photo }))
        return new Response(jpeg, {
          headers: {
            "Content-Type": "image/jpeg",
            ...(trip ? cacheHeaders(24 * 3600, 7 * 24 * 3600) : cacheHeaders(7 * 24 * 3600, 30 * 24 * 3600)),
          },
        })
      },
    },
  },
})
