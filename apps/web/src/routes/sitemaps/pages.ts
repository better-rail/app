import { createFileRoute } from "@tanstack/react-router"
import { pagesSitemap, buildDate, xmlResponse } from "@/lib/sitemap"

export const Route = createFileRoute("/sitemaps/pages")({
  server: { handlers: { GET: () => xmlResponse(pagesSitemap(buildDate())) } },
})
