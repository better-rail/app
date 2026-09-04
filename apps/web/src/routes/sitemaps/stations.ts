import { createFileRoute } from "@tanstack/react-router"
import { stationsSitemap, today, xmlResponse } from "@/lib/sitemap"

export const Route = createFileRoute("/sitemaps/stations")({
  server: { handlers: { GET: () => xmlResponse(stationsSitemap(today())) } },
})
