import { createFileRoute } from "@tanstack/react-router"
import { sitemapIndex, today, xmlResponse } from "@/lib/sitemap"

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: () => xmlResponse(sitemapIndex(today())) } },
})
