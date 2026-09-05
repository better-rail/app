# Better Rail Web

The better-rail.co.il website and the web version of the Better Rail timetable, built with
[TanStack Start](https://tanstack.com/start) (React 19, TanStack Router + Query, Tailwind v4) and deployed to Cloudflare Workers.

## What's here

- **Trip planner & timetable** — `/`, `/routes/<from>/<to>`, `/stations`, `/stations/<slug>`. Server-rendered for SEO, then
  live-updating (60s polling) in the browser. Hebrew at the root, English under `/en`.
- **Marketing / legal pages** ported from the old static site — `/about`, `/press`, `/contact`, `/terms`,
  `/image-attributions`, `/israel-railways-lawsuit`, `/privacy-policy` (+ `/en/privacy-policy`), `/thank-you`.
  `public/gtfs-siri-issues.html` is kept as a standalone document.
- **SEO** — per-page titles/descriptions, canonical + hreflang, Open Graph/Twitter cards, JSON-LD
  (`BreadcrumbList`, `FAQPage`, `TrainTrip` lists, `TrainStation`), a sitemap index at `/sitemap.xml` covering every
  ordered station pair (~4.7k route pages × 2 languages), and CDN cache headers per route.

Better Rail Live, notifications, widgets and the tip jar are intentionally not part of the web app.

## Development

```bash
bun install           # from the repo root
bun run web:dev       # http://localhost:3000
bun run web:test      # unit tests (bun test)
bun run web:compile   # tsc --noEmit
bun run web:build     # production build (Cloudflare Workers adapter)
```

`bun run preview` (in `apps/web`) serves the production build in a local workerd, which is the closest thing to the deployed
Worker: edge caching and the `_headers` rules are active there but not in `dev`.

Timetable data comes from the Better Rail server (`https://api.better-rail.co.il`) through a server function
(`src/lib/api/find-routes.ts`), so the browser never talks to the API directly. Override the base URL with
`RAIL_API_BASE` when pointing at a staging server.

### Station data & photos

Stations and their photos live in the shared `@better-rail/stations` workspace package. The web copies
(`public/stations/*.webp` + `public/stations/og/*.jpg`) are generated with `sharp` before every `dev` and `build`, are
gitignored, and only re-render when a source photo changed. Run `bun run build:images` to refresh them by hand.

## Layout

```
src/
  routes/            file-based routes ({-$locale} = optional /en prefix, _site = Hebrew-only pages, sitemaps)
  components/        planner, routes (cards, details, actions), stations, layout
  lib/api/           timetable server function, response normalisation, query options
  lib/               time (Israel wall-clock helpers), format, seo, sitemap, storage, calendar
  data/stations.ts   slugs, lookups, hubs & popular routes on top of @better-rail/stations
  i18n/              he/en dictionaries + locale helpers
public/              static assets (fonts, images, press logos, generated station photos)
```

## Deployment

The site is a single Cloudflare Worker (`wrangler.jsonc`, name `better-rail-web`): `@cloudflare/vite-plugin` bundles the
TanStack Start server entry as the Worker and uploads `dist/client` as its static assets. `src/server.ts` wraps the default
handler to add the security headers to server-rendered responses and to cache them at the edge (Cache API) according to
each route's `CDN-Cache-Control` header (`s-maxage` fresh, then `stale-while-revalidate` served stale while a background
render refreshes it). `public/_headers` covers static assets only.

Builds run on [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) from the GitHub repo:

| Setting                              | Value                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Root directory                       | `apps/web`                                                                   |
| Build command                        | `bun run build`                                                              |
| Deploy command                       | `bunx wrangler deploy`                                                       |
| Non-production branch deploy command | `bunx wrangler versions upload`                                              |
| Build variable                       | `BUN_VERSION` = `1.3.9` (the image's default Bun is older than our lockfile) |

Pushes to `main` deploy production. With **Builds for non-production branches** enabled (Settings → Build → Branch
control), every other branch gets a preview version at `https://<branch>-better-rail-web.<account>.workers.dev`, and
Cloudflare comments the URL on the pull request. The Cache API is inert on `workers.dev` hosts, so previews always render
fresh.

Manual deploy from a machine that has run `bunx wrangler login`: `bun run deploy`.
