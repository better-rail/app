import { Link, useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Menu, X, Smartphone } from "lucide-react"
import { GithubIcon } from "./icons"
import { trackEvent } from "@/lib/analytics"
import { useLocale, useT, type Locale } from "@/i18n"
import { cn } from "@/lib/cn"
import { GITHUB_URL, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { AppIcon } from "./logo"
import { LocaleLink } from "./locale-link"

/** Marketing pages exist in Hebrew only; the language switch on them goes to the other locale's home page. */
function useOtherLocaleHref(locale: Locale): string {
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  })
  const localizedPrefixes = ["/routes/", "/privacy-policy"]
  const stripped = pathname.replace(/^\/en(?=\/|$)/, "") || "/"
  const isLocalized = stripped === "/" || localizedPrefixes.some((prefix) => stripped.startsWith(prefix))
  if (locale === "he") return isLocalized ? `/en${stripped === "/" ? "" : stripped}${searchStr}` : "/en"
  return isLocalized ? `${stripped}${searchStr}` : "/"
}

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const t = useT()
  const locale = useLocale()
  const otherLocaleHref = useOtherLocaleHref(locale)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false)
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const navLinks = [{ to: "/{-$locale}", label: t("nav.plan") }]
  const siteLinks = [
    { href: "/about", label: t("nav.about") },
    { href: "/press", label: t("nav.press") },
  ]

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-colors",
        transparent ? "border-transparent bg-bg/70" : "border-line/70 bg-bg/85",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
      >
        {t("site.skipToContent")}
      </a>
      <nav className="container-page flex h-16 items-center gap-6" aria-label={t("nav.menu")}>
        <LocaleLink to="/{-$locale}" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label={t("nav.home")}>
          <AppIcon className="size-9" />
          <span className="text-[19px]">Better Rail</span>
        </LocaleLink>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <LocaleLink
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/{-$locale}" }}
              className="rounded-lg px-3 py-2 text-[15px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text [&.active]:text-brand-text"
            >
              {link.label}
            </LocaleLink>
          ))}
          {siteLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="rounded-lg px-3 py-2 text-[15px] font-medium text-text-2 transition-colors hover:bg-surface-3 hover:text-text [&.active]:text-brand-text"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-1.5">
          <a
            href={otherLocaleHref}
            className="rounded-lg px-3 py-2 text-[14px] font-semibold text-text-2 transition-colors hover:bg-surface-3 hover:text-text"
            lang={locale === "he" ? "en" : "he"}
            hrefLang={locale === "he" ? "en" : "he"}
          >
            {t("nav.language")}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn hidden sm:inline-flex"
            aria-label="GitHub"
          >
            <GithubIcon className="size-5" />
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary hidden h-10 px-4 text-[14px] md:inline-flex"
            onClick={() => trackEvent("download_click", { platform: "header" })}
          >
            <Smartphone className="size-4" />
            {t("nav.download")}
          </a>
          <button
            type="button"
            className="icon-btn md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("nav.close") : t("nav.menu")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="animate-fade-in fixed inset-x-0 top-16 bottom-0 z-40 bg-bg/95 backdrop-blur-md md:hidden"
        >
          <div className="container-page flex flex-col gap-1 py-4 text-lg font-semibold">
            {navLinks.map((link) => (
              <LocaleLink
                key={link.to}
                to={link.to}
                className="rounded-xl px-4 py-3 hover:bg-surface-3 [&.active]:text-brand-text"
              >
                {link.label}
              </LocaleLink>
            ))}
            {siteLinks.map((link) => (
              <Link key={link.href} to={link.href} className="rounded-xl px-4 py-3 hover:bg-surface-3 [&.active]:text-brand-text">
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t("home.downloadIos")}
              </a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                {t("home.downloadAndroid")}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
