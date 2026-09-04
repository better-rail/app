import { stations } from "@/data/stations"
import { localePath, locales, type Locale } from "@/i18n"
import { absoluteUrl } from "./seo"

export const ROUTES_PER_SITEMAP = 1000

/** Hebrew-only marketing pages — one URL each, no alternates. */
export const STATIC_PAGES = [
  "/about",
  "/press",
  "/contact",
  "/terms",
  "/image-attributions",
  "/israel-railways-lawsuit",
  "/gtfs-siri-issues.html",
]

/** Pages that exist in every locale. */
export const LOCALIZED_PAGES = ["/", "/stations", "/privacy-policy"]

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export interface SitemapEntry {
  /** Site path without a locale prefix */
  path: string
  localized: boolean
  lastmod?: string
  changefreq?: "hourly" | "daily" | "weekly" | "monthly"
  priority?: number
}

function urlNode(entry: SitemapEntry, locale: Locale): string {
  const loc = absoluteUrl(localePath(locale, entry.path))
  const alternates = entry.localized
    ? [
        ...locales.map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt}" href="${escapeXml(absoluteUrl(localePath(alt, entry.path)))}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(localePath("he", entry.path)))}"/>`,
      ].join("\n")
    : ""
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    alternates,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : "",
    entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : "",
    entry.priority !== undefined ? `    <priority>${entry.priority.toFixed(1)}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n")
}

export function urlset(entries: SitemapEntry[]): string {
  const nodes = entries.flatMap((entry) =>
    (entry.localized ? locales : (["he"] as Locale[])).map((locale) => urlNode(entry, locale)),
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...nodes,
    "</urlset>",
  ].join("\n")
}

/** Every ordered station pair — the route pages we want indexed. */
export function routePairs(): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (const from of stations) {
    for (const to of stations) {
      if (from.id !== to.id) pairs.push([from.slug, to.slug])
    }
  }
  return pairs
}

export const routeSitemapCount = () => Math.ceil(routePairs().length / ROUTES_PER_SITEMAP)

export function sitemapIndex(lastmod: string): string {
  const files = [
    "/sitemaps/pages",
    "/sitemaps/stations",
    ...Array.from({ length: routeSitemapCount() }, (_, i) => `/sitemaps/routes/${i + 1}`),
  ]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map(
      (file) => `  <sitemap>\n    <loc>${escapeXml(absoluteUrl(file))}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
    ),
    "</sitemapindex>",
  ].join("\n")
}

export function pagesSitemap(lastmod: string): string {
  return urlset([
    ...LOCALIZED_PAGES.map<SitemapEntry>((path) => ({
      path,
      localized: true,
      lastmod,
      changefreq: "weekly",
      priority: path === "/" ? 1 : 0.8,
    })),
    ...STATIC_PAGES.map<SitemapEntry>((path) => ({ path, localized: false, lastmod, changefreq: "monthly", priority: 0.5 })),
  ])
}

export function stationsSitemap(lastmod: string): string {
  return urlset(
    stations.map<SitemapEntry>((station) => ({
      path: `/stations/${station.slug}`,
      localized: true,
      lastmod,
      changefreq: "weekly",
      priority: 0.7,
    })),
  )
}

export function routesSitemap(page: number, lastmod: string): string | null {
  const pairs = routePairs()
  const start = (page - 1) * ROUTES_PER_SITEMAP
  if (page < 1 || start >= pairs.length) return null
  return urlset(
    pairs.slice(start, start + ROUTES_PER_SITEMAP).map<SitemapEntry>(([from, to]) => ({
      path: `/routes/${from}/${to}`,
      localized: true,
      lastmod,
      changefreq: "daily",
      priority: 0.6,
    })),
  )
}

export const xmlResponse = (body: string | null) =>
  body === null
    ? new Response("Not found", { status: 404 })
    : new Response(body, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      })

export const today = () => new Date().toISOString().slice(0, 10)
