# Better Rail Web

The better-rail.co.il website and the web version of the Better Rail timetable, built with
[TanStack Start](https://tanstack.com/start) (React 19, TanStack Router + Query, Tailwind v4) and deployed to Netlify.

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
bun run web:build     # production build (Netlify adapter)
```

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

Netlify builds with `bun run build` and publishes `dist/client`; the SSR handler is emitted as a Netlify function by
`@netlify/vite-plugin-tanstack-start`. Set the site's base directory to `apps/web`.
