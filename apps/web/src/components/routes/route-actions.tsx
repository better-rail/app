import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { CalendarPlus, Share2 } from "lucide-react"
import type { RouteItem } from "@/lib/api/types"
import { stationNameById } from "@/data/stations"
import { useLocale, useT } from "@/i18n"
import { formatClock } from "@/lib/time"
import { formatLongDate } from "@/lib/format"
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/cn"
import { Tooltip } from "../tooltip"

/** The box the menu must stay inside: the nearest ancestor that clips its overflow (the details card), else the viewport. */
function clipBox(element: HTMLElement): { left: number; right: number } {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    if (getComputedStyle(node).overflowX !== "visible") return node.getBoundingClientRect()
  }
  return { left: 0, right: window.innerWidth }
}

export function RouteActions({
  route,
  originId,
  destinationId,
  shareUrl,
}: {
  route: RouteItem
  originId: string
  destinationId: string
  shareUrl: string
}) {
  const t = useT()
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  /** Anchored at the button's end edge, growing towards the start — right when the actions sit at the end of the row. */
  const [alignEnd, setAlignEnd] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuPanel = useRef<HTMLDivElement>(null)

  // The header wraps on narrow screens, which puts the actions at the start of their own row; from there a menu growing
  // towards the start runs out of the card and gets clipped. Measured on open, before paint.
  useLayoutEffect(() => {
    const anchor = menuRef.current
    const menu = menuPanel.current
    if (!calendarOpen || !anchor || !menu) return
    const rtl = getComputedStyle(menu).direction === "rtl"
    const bounds = clipBox(anchor)
    const rect = anchor.getBoundingClientRect()
    const width = menu.offsetWidth
    const margin = 8
    setAlignEnd(rtl ? rect.left + width <= bounds.right - margin : rect.right - width >= bounds.left + margin)
  }, [calendarOpen])

  useEffect(() => {
    if (!calendarOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setCalendarOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [calendarOpen])

  const origin = stationNameById(originId, locale)
  const destination = stationNameById(destinationId, locale)
  const arrow = locale === "he" ? "←" : "→"
  const shareText = [
    `🚆 ${origin} ${arrow} ${destination}`,
    "",
    `📅 ${formatLongDate(route.departureTime, locale)}`,
    `${locale === "he" ? "יוצאת ב" : "Departs at"} ${formatClock(route.departureTime)}`,
    `${locale === "he" ? "מגיעה ב" : "Arrives at"} ${formatClock(route.arrivalTime)}`,
  ].join("\n")

  const event: CalendarEvent = {
    title: `🚆 ${origin} ${arrow} ${destination}`,
    description: shareText,
    location: locale === "he" ? `תחנת רכבת ${origin}` : `${origin} train station`,
    url: shareUrl,
    route,
  }

  const share = async () => {
    trackEvent("route_share")
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl })
        return
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return
      }
    }
    await copy()
  }

  /** Desktop browsers without the Web Share API fall back to putting the link on the clipboard. */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked — nothing to do
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip label={t("details.share")}>
        <button type="button" onClick={share} className="icon-btn" aria-label={t("details.share")}>
          <Share2 className="size-5" />
        </button>
      </Tooltip>
      <div ref={menuRef} className="relative">
        <Tooltip label={t("details.addToCalendar")} disabled={calendarOpen}>
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={calendarOpen}
            className={cn("icon-btn", calendarOpen && "bg-surface-3")}
            aria-label={t("details.addToCalendar")}
          >
            <CalendarPlus className="size-5" />
          </button>
        </Tooltip>
        {calendarOpen && (
          <div
            ref={menuPanel}
            role="menu"
            className={cn(
              "animate-fade-up absolute top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop",
              alignEnd ? "end-0" : "start-0",
            )}
          >
            <a
              role="menuitem"
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent("route_calendar", { provider: "google" })
                setCalendarOpen(false)
              }}
              className="block rounded-lg px-3 py-2 text-[14px] hover:bg-surface-3"
            >
              {t("details.googleCalendar")}
            </a>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                trackEvent("route_calendar", { provider: "ics" })
                downloadIcs(event)
                setCalendarOpen(false)
              }}
              className="block w-full rounded-lg px-3 py-2 text-start text-[14px] hover:bg-surface-3"
            >
              {t("details.appleCalendar")}
            </button>
          </div>
        )}
      </div>
      {copied && (
        <span role="status" className="animate-fade-in ms-1 text-[13px] font-medium text-success">
          {t("details.copied")}
        </span>
      )}
    </div>
  )
}
