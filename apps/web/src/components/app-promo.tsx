import { useT } from "@/i18n"
import { trackEvent } from "@/lib/analytics"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"

const STORES = [
  { platform: "ios", url: APP_STORE_URL, badge: "/assets/images/app-store-badge.svg", label: "home.downloadIos" },
  { platform: "android", url: PLAY_STORE_URL, badge: "/assets/images/google-play-badge.svg", label: "home.downloadAndroid" },
] as const

/** The app pitch under the planner: screenshots and the store badges. */
export function AppPromo() {
  const t = useT()
  return (
    <section className="border-t border-line/60 bg-surface/60 dark:bg-surface/40" aria-labelledby="app-promo-title">
      <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-20 xl:max-w-7xl">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
          <h2 id="app-promo-title" className="text-balance text-3xl font-bold tracking-tight lg:text-4xl">
            {t("promo.title")}
          </h2>
          <p className="mt-3 max-w-md text-pretty text-[17px] leading-relaxed text-text-2">{t("promo.subtitle")}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            {STORES.map((store) => (
              <a
                key={store.platform}
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t(store.label)} ${t("a11y.newTab")}`}
                onClick={() => trackEvent("download_click", { platform: store.platform, source: "promo" })}
                className="rounded-lg transition-[scale,opacity] duration-150 ease-out-expo hover:opacity-90 active:scale-[0.97]"
              >
                <img src={store.badge} alt="" width={160} height={54} className="h-[54px] w-auto" />
              </a>
            ))}
          </div>
        </div>

        <picture className="mx-auto w-full max-w-[520px] lg:max-w-none">
          <source
            type="image/webp"
            srcSet="/assets/images/app-screenshots-large.webp 1x, /assets/images/app-screenshots-large@2x.webp 2x, /assets/images/app-screenshots-large@3x.webp 3x"
          />
          <img
            src="/assets/images/app-screenshots-large.png"
            srcSet="/assets/images/app-screenshots-large@2x.png 2x, /assets/images/app-screenshots-large@3x.png 3x"
            alt={t("promo.screenshotAlt")}
            width={586}
            height={621}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        </picture>
      </div>
    </section>
  )
}
