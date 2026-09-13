import { useEffect, useRef, useState } from "react"
import { useT } from "@/i18n"
import { useMobilePlatform } from "@/hooks/use-mobile-platform"
import { trackEvent } from "@/lib/analytics"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { cn } from "@/lib/cn"
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.627L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
    </svg>
  )
}

type Store = {
  platform: "ios" | "android"
  url: string
  qr: string
  name: string
}

const STORES: Store[] = [
  { platform: "ios", url: APP_STORE_URL, qr: "/assets/images/qr/app-store.svg", name: "App Store" },
  { platform: "android", url: PLAY_STORE_URL, qr: "/assets/images/qr/play-store.svg", name: "Google Play" },
]

/**
 * One store icon. On desktop, hovering or focusing it reveals a small card with that store's QR code, since a
 * desktop click can't install anything; the link itself still opens the store page for those who want it.
 */
function StoreLink({ store, showQr }: { store: Store; showQr: boolean }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = t(store.platform === "ios" ? "home.downloadIos" : "home.downloadAndroid")

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onBlur={(event) => !ref.current?.contains(event.relatedTarget as Node) && setOpen(false)}
    >
      <a
        href={store.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("icon-btn", open && "bg-surface-3")}
        aria-label={label}
        title={showQr ? undefined : label}
        aria-describedby={showQr && open ? `qr-${store.platform}` : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => trackEvent("download_click", { platform: store.platform, source: "header" })}
      >
        {store.platform === "ios" ? <AppleIcon className="size-[22px]" /> : <PlayIcon className="size-5" />}
      </a>

      {showQr && open && (
        <div
          id={`qr-${store.platform}`}
          role="tooltip"
          className="animate-fade-up absolute end-1/2 top-full z-20 mt-1 w-[168px] translate-x-1/2 rounded-2xl border border-line bg-surface p-3 text-center shadow-pop rtl:-translate-x-1/2"
        >
          <span className="block rounded-xl bg-white p-2">
            <img src={store.qr} alt="" aria-hidden="true" className="size-full" width={128} height={128} />
          </span>
          <span className="mt-2.5 block text-[13px] font-semibold leading-tight">{store.name}</span>
          <span className="mt-0.5 block text-[12px] leading-tight text-muted">{t("nav.scanToDownload")}</span>
        </div>
      )}
    </div>
  )
}

/** Header store links: an icon per store, hiding the one that can't install on this phone. Desktop gets QR codes. */
export function StoreLinks() {
  const platform = useMobilePlatform()

  return (
    <>
      {STORES.filter((store) => platform === null || store.platform === platform).map((store) => (
        <StoreLink key={store.platform} store={store} showQr={platform === null} />
      ))}
    </>
  )
}
