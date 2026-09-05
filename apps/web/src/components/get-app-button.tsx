import { useEffect, useRef, useState } from "react"
import { Smartphone } from "lucide-react"
import { useT } from "@/i18n"
import { useMobilePlatform } from "@/hooks/use-mobile-platform"
import { trackEvent } from "@/lib/analytics"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { cn } from "@/lib/cn"

const STORES = [
  { platform: "ios", url: APP_STORE_URL, qr: "/assets/images/qr/app-store.svg", label: "App Store" },
  { platform: "android", url: PLAY_STORE_URL, qr: "/assets/images/qr/play-store.svg", label: "Google Play" },
] as const

/**
 * Header call to action. On a phone or tablet it links straight to that device's store; everywhere else it is a
 * button opening a popover with a QR code per store, since a desktop click cannot install anything — and since
 * there is no honest href to put behind it, one the status bar, "copy link" and cmd-click would all promise.
 *
 * The platform is only known after mount, so the desktop shape renders first and phones swap to a link on
 * hydration.
 */
export function GetAppButton({ className }: { className?: string }) {
  const t = useT()
  const platform = useMobilePlatform()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const triggerClass = "btn-primary h-10 px-4 text-[14px]"
  const triggerContent = (
    <>
      <Smartphone className="size-4" />
      {t("nav.download")}
    </>
  )

  return (
    <div ref={popoverRef} className={cn("relative", className)}>
      {platform ? (
        <a
          href={platform === "android" ? PLAY_STORE_URL : APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("download_click", { platform, source: "header" })}
          className={triggerClass}
        >
          {triggerContent}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={triggerClass}
        >
          {triggerContent}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("nav.download")}
          className="animate-fade-up absolute end-0 top-full z-20 mt-2 rounded-2xl border border-line bg-surface p-4 shadow-pop"
        >
          <p className="mb-3 text-center text-[13px] font-medium text-text-2">{t("nav.scanToDownload")}</p>
          <div className="flex gap-4" dir="ltr">
            {STORES.map((store) => (
              <a
                key={store.platform}
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("download_click", { platform: store.platform, source: "header_qr" })}
                className="group flex w-[124px] flex-col items-center gap-2"
              >
                <span className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-line transition-transform duration-200 ease-out-expo group-hover:-translate-y-0.5">
                  <img src={store.qr} alt="" aria-hidden="true" className="size-[108px]" width={108} height={108} />
                </span>
                <span className="text-[13px] font-semibold">{store.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
