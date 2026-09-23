import { useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { AppIcon } from "./logo"
import { StoreLinks } from "./store-links"
import { LocaleLink } from "./locale-link"
import { ThemeToggle } from "./theme-toggle"

/** Logo, theme toggle and store links only; every other link lives in the footer. */
export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const t = useT()

  return (
    <header className="sticky top-0 z-40">
      <div
        className={cn(
          "border-b backdrop-blur-md transition-colors",
          transparent ? "border-transparent bg-bg/70" : "border-line/70 bg-bg/85",
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
        >
          {t("site.skipToContent")}
        </a>
        <nav className="container-page flex h-15 items-center gap-6" aria-label={t("nav.menu")}>
          {/* Named by its visible text: "Better Rail" is what a voice-control user will say to reach it. */}
          <LocaleLink to="/{-$locale}" className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight">
            <AppIcon className="size-9" transitionName="brand-icon" />
            <span className="text-[19px]">Better Rail</span>
          </LocaleLink>

          <div className="ms-auto flex items-center gap-0.5">
            <ThemeToggle />
            <StoreLinks />
          </div>
        </nav>
      </div>
    </header>
  )
}
