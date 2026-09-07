import { createFileRoute } from "@tanstack/react-router"
import { routesSitemap, today, xmlResponse } from "@/lib/sitemap"

export const Route = createFileRoute("/sitemaps/routes/$page")({
  server: { handlers: { GET: ({ params }) => xmlResponse(routesSitemap(Number(params.page), today())) } },
})
