import { Link, useRouterState } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"
import { GithubIcon } from "./icons"
import { trackEvent } from "@/lib/analytics"
import { useMobilePlatform } from "@/hooks/use-mobile-platform"
import { useLocale, useT, type Locale } from "@/i18n"
import { cn } from "@/lib/cn"
import { GITHUB_URL, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/seo"
import { AppIcon } from "./logo"
import { GetAppButton } from "./get-app-button"
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
  const platform = useMobilePlatform()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const menuButton = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)

  useEffect(() => setMenuOpen(false), [pathname])

  // The open menu is a modal: the page behind it is inert, focus starts on its first link, stays inside it, and goes
  // back to the button that opened it when it closes.
  useEffect(() => {
    if (!menuOpen) return
    const panel = menu.current
    const button = menuButton.current
    const tabbables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        return
      }
      if (event.key !== "Tab") return
      const items = tabbables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    // Everything but the header (the menu lives in it, with the button that closes it) is put out of reach.
    const outside = Array.from(document.body.children).filter((node) => !node.contains(header.current))
    for (const node of outside) node.setAttribute("inert", "")
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    tabbables()[0]?.focus()
    return () => {
      for (const node of outside) node.removeAttribute("inert")
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      button?.focus({ preventScroll: true })
    }
  }, [menuOpen])

  const navLinks = [{ to: "/{-$locale}", label: t("nav.plan") }]
  // The device's own store leads, so an Android phone is not offered the App Store as its primary button.
  const storeLinks = [
    { platform: "ios", url: APP_STORE_URL, label: t("home.downloadIos") },
    { platform: "android", url: PLAY_STORE_URL, label: t("home.downloadAndroid") },
  ]
  if (platform === "android") storeLinks.reverse()
  const siteLinks = [
    { href: "/about", label: t("nav.about") },
    { href: "/press", label: t("nav.press") },
  ]

  return (
    <header ref={header} className="sticky top-0 z-40">
      {/* The blur lives on this bar rather than the header: a backdrop filter would make the header the containing
          block for the fixed mobile menu below, collapsing it to nothing. */}
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
        <nav className="container-page flex h-16 items-center gap-6" aria-label={t("nav.menu")}>
          {/* Named by its visible text: "Better Rail" is what a voice-control user will say to reach it. */}
          <LocaleLink to="/{-$locale}" className="flex items-center gap-2.5 font-bold tracking-tight">
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
              className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-[14px] font-semibold text-text-2 transition-colors hover:bg-surface-3 hover:text-text"
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
            <GetAppButton className="hidden md:block" />
            <button
              ref={menuButton}
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
      </div>

      {menuOpen && (
        <div
          ref={menu}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("nav.menu")}
          className="animate-fade-in fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
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
              {storeLinks.map((store, index) => (
                <a
                  key={store.platform}
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("download_click", { platform: store.platform, source: "menu" })}
                  className={index === 0 ? "btn-primary" : "btn-secondary"}
                >
                  {store.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
