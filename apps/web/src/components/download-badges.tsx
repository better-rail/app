import { useT } from "@/i18n"
import { trackEvent } from "@/lib/analytics"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { cn } from "@/lib/cn"

export function DownloadBadges({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const t = useT()
  const width = size === "sm" ? "w-[132px]" : "w-[150px] sm:w-[168px]"
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)} dir="ltr">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("download_click", { platform: "ios" })}
        className="transition-transform duration-200 ease-out-expo hover:-translate-y-0.5"
      >
        <img
          src="/assets/images/app-store-badge.svg"
          alt={t("home.downloadIos")}
          className={cn(width, "h-auto")}
          width={168}
          height={56}
        />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("download_click", { platform: "android" })}
        className="transition-transform duration-200 ease-out-expo hover:-translate-y-0.5"
      >
        <img
          src="/assets/images/google-play-badge.svg"
          alt={t("home.downloadAndroid")}
          className={cn(width, "h-auto")}
          width={168}
          height={56}
        />
      </a>
    </div>
  )
}
