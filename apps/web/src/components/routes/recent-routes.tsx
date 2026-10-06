import { useState } from "react"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { StationImage } from "@/components/stations/station-image"
import { getStationById, stationName, type Station } from "@/data/stations"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { recentRoutes, type StoredRoute } from "@/lib/storage"
import { useRecentRoutes, useRecentTrayOpen } from "@/hooks/use-stored"

type Pair = readonly [Station, Station]

/**
 * Recent searches in a collapsible tray below the planner: a slim title row until opened, then photo cards. A route
 * and its return trip share one card.
 */
export function RecentRoutes() {
  const t = useT()
  const recent = toPairs(useRecentRoutes()).slice(0, 4)
  const [open, setOpen] = useRecentTrayOpen()
  if (recent.length === 0) return null
  const taken = (index: number) => recent.slice(0, index).map(([, to]) => to.id)
  return (
    <section
      className="animate-fade-in border-t border-line/60 bg-surface/60 dark:bg-surface/40"
      aria-labelledby="recent-routes-title"
    >
      <div className="container-page py-4 lg:py-5">
        <div className="flex min-h-10 items-center justify-between gap-2">
          <h2 id="recent-routes-title">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="recent-routes-tray"
              className="group -my-1 flex items-center gap-1.5 py-1 text-[15px] font-semibold text-text"
            >
              {t("home.recent")}
              <ChevronDown
                className={cn(
                  "size-4 text-dim transition-[rotate,color] duration-300 ease-out-expo group-hover:text-text-2",
                  open && "rotate-180",
                )}
              />
            </button>
          </h2>
          {open && (
            // The vertical padding stretches the tap target to 40px without moving the cards.
            <button
              type="button"
              onClick={recentRoutes.clear}
              className="-my-2.5 animate-fade-in py-2.5 text-[13px] font-medium text-dim transition-colors hover:text-text-2"
            >
              {t("home.clearRecent")}
            </button>
          )}
        </div>
        {/* Rows animate between 0fr and 1fr, so the tray opens to its content's height without measuring it. */}
        <div
          id="recent-routes-tray"
          inert={!open}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out-expo",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          {/* The padding keeps the cards' shadows and hover scale clear of the clipping edge. */}
          <div className="-mx-2 min-h-0 overflow-hidden px-2">
            <ul className="grid grid-cols-2 gap-3 pt-3 pb-4 lg:grid-cols-4 lg:gap-4">
              {recent.map((pair, index) => (
                <RecentRouteCard key={pairKey(pair[0].id, pair[1].id)} pair={pair} taken={taken(index)} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/** `taken`: destinations pictured by earlier cards, so two neighbours don't show the same photo. */
function RecentRouteCard({ pair, taken }: { pair: Pair; taken: string[] }) {
  const t = useT()
  const locale = useLocale()
  const [reversed, setReversed] = useState(false)
  const [from, to] = reversed ? [pair[1], pair[0]] : pair
  const photo = photoFor([from, to], taken)
  return (
    <li className="group/card relative">
      <LocaleLink
        to="/{-$locale}/routes/$from/$to"
        params={{ from: from.id, to: to.id }}
        className="group relative block h-28 overflow-hidden lg:h-32 rounded-card bg-surface-3 shadow-card transition-[box-shadow,scale] duration-200 ease-out-expo hover:shadow-card-hover active:scale-[0.98]"
      >
        <StationImage
          station={photo}
          sizes="(min-width: 1024px) 320px, 50vw"
          className="absolute inset-0 transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
        />
        <span className="station-photo-gradient absolute inset-0" aria-hidden="true" />
        {/* An extra scrim under the names: bright photos wash out the smaller origin line. */}
        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/45 to-transparent" aria-hidden="true" />
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 pe-12 leading-tight text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.8)]">
          <span className="truncate text-[14px] font-semibold text-white/75">{stationName(from, locale)}</span>
          <span className="truncate text-[17px] font-bold">{stationName(to, locale)}</span>
        </span>
      </LocaleLink>
      {/* A sibling of the link, not inside it: interactive content can't nest. Mouse users see it on hover. */}
      <button
        type="button"
        onClick={() => setReversed(!reversed)}
        aria-label={t("home.reverseRoute")}
        title={t("home.reverseRoute")}
        className="absolute end-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-[background-color,scale,opacity] duration-150 ease-out-expo hover:bg-black/55 focus-visible:opacity-100 active:scale-90 group-hover/card:opacity-100 pointer-fine:opacity-0"
      >
        <ArrowUpDown className="size-4" />
      </button>
    </li>
  )
}

/** The destination's photo, or the origin's when an earlier card already shows that destination. */
const photoFor = ([from, to]: Pair, taken: string[]) => (taken.includes(to.id) && !taken.includes(from.id) ? from : to)

const pairKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`)

/** One entry per station pair, in the direction searched last; drops stations the API no longer knows about. */
function toPairs(routes: StoredRoute[]): Pair[] {
  const seen = new Set<string>()
  const pairs: Pair[] = []
  for (const route of routes) {
    const from = getStationById(route.originId)
    const to = getStationById(route.destinationId)
    const key = pairKey(route.originId, route.destinationId)
    if (!from || !to || seen.has(key)) continue
    seen.add(key)
    pairs.push([from, to])
  }
  return pairs
}
