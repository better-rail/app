import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { AppleIcon, PlayIcon } from "@/components/store-links"
import { useT } from "@/i18n"
import { useAppBannerDismissed } from "@/hooks/use-stored"
import { useMobilePlatform } from "@/hooks/use-mobile-platform"
import { trackEvent } from "@/lib/analytics"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { cn } from "@/lib/cn"

// Let the page settle before the banner rises; it should not compete with the planner for first attention.
const SHOW_DELAY_MS = 1200
const HIDE_MS = 260

const STORES = [
  { platform: "ios" as const, url: APP_STORE_URL, label: "home.downloadIos" as const, Icon: AppleIcon },
  {
    platform: "android" as const,
    url: PLAY_STORE_URL,
    name: "Google Play",
    label: "home.downloadAndroid" as const,
    Icon: PlayIcon,
  },
]

/**
 * A one-time nudge to install the app, rising from the bottom on the first visit. Dismissing it is remembered, so
 * riders who use the site for timetables are not asked again.
 */
export function AppBanner() {
  const t = useT()
  const platform = useMobilePlatform()
  const [dismissed, dismiss] = useAppBannerDismissed()
  const [ready, setReady] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [dismissed])

  if (dismissed || !ready) return null

  const close = (reason: "dismiss" | "download") => {
    if (closing) return
    setClosing(true)
    trackEvent("app_banner_close", { reason })
    window.setTimeout(() => dismiss(true), HIDE_MS)
  }

  const stores = STORES.filter((store) => platform === null || store.platform === platform)

  return (
    <aside
      aria-label={t("appBanner.title")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:end-6 sm:bottom-6 sm:p-0",
        closing ? "animate-banner-down" : "animate-banner-up",
      )}
    >
      <div className="relative rounded-2xl border border-line bg-surface p-4 shadow-pop sm:w-[380px]">
        <p className="text-center text-[16px] font-bold leading-tight">{t("appBanner.title")}</p>
        {/* Quiet secondary buttons: the page's blue is reserved for the planner's primary actions. */}
        <div className="mt-4 grid grid-flow-col auto-cols-fr gap-2.5">
          {stores.map((store) => (
            <a
              key={store.platform}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent("download_click", { platform: store.platform, source: "banner" })
                close("download")
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-3 px-3 text-[14px] font-semibold text-text transition-colors hover:bg-line active:scale-[0.98]"
            >
              <store.Icon className="size-[18px]" />
              {t(store.label)}
            </a>
          ))}
        </div>
        {/* Perched on the card's corner, outside its content, so the title can sit centred. */}
        <button
          type="button"
          onClick={() => close("dismiss")}
          aria-label={t("nav.close")}
          className="absolute -end-2.5 -top-2.5 inline-flex size-8 items-center justify-center rounded-full border border-line bg-surface text-text-2 shadow-[0_1px_4px_rgb(0_0_0/0.12)] transition-colors hover:bg-surface-3 active:scale-95"
        >
          <X className="size-4" />
        </button>
      </div>
    </aside>
  )
}
