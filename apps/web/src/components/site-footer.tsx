import { Link, useRouterState } from "@tanstack/react-router"
import { useLocale, useT, type Locale } from "@/i18n"
import { trackEvent } from "@/lib/analytics"
import { DISCORD_URL, GITHUB_URL, SUPPORT_URL, TWITTER_URL } from "@/lib/seo"
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

export function SiteFooter() {
  const t = useT()
  const locale = useLocale()
  const otherLocaleHref = useOtherLocaleHref(locale)
  // These pages exist in Hebrew only; from the English site the links say so, and assistive tech switches language.
  const hebrewOnly = locale === "he" ? {} : { lang: "he", hrefLang: "he" }
  const links = [
    { to: "/about", label: t("footer.about") },
    { to: "/image-attributions", label: t("footer.attributions") },
    { to: "/privacy-policy", label: t("footer.privacy") },
    { to: "/terms", label: t("footer.terms") },
    { to: "/contact", label: t("footer.contact") },
  ]

  const socials = [
    { href: GITHUB_URL, icon: "github", label: t("footer.github") },
    { href: DISCORD_URL, icon: "discord", label: "Discord" },
    { href: TWITTER_URL, icon: "twitter", label: t("footer.twitter") },
  ]
  const linkClass = "link-underline py-1 text-[17px] text-brand-text"

  return (
    <footer className="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="container-page flex flex-col items-center py-12 text-center">
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("support_click")}
          className="rounded-full bg-brand-fill px-7 py-1 text-xl font-medium text-white transition-colors hover:bg-brand-fill-strong"
        >
          {t("footer.support")}
        </a>

        <div className="mt-6 flex items-center gap-3">
          {socials.map((social) => (
            <a
              key={social.icon}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="rounded-full transition-transform active:scale-95"
            >
              <img src={`/assets/icons/${social.icon}.svg`} alt="" width={35} height={35} className="size-[35px] dark:invert" />
            </a>
          ))}
        </div>

        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label={t("footer.nav")}>
          {links.map((link) =>
            link.to === "/privacy-policy" ? (
              <LocaleLink key={link.to} to="/{-$locale}/privacy-policy" className={linkClass}>
                {link.label}
              </LocaleLink>
            ) : (
              <Link key={link.to} to={link.to} className={linkClass} {...hebrewOnly}>
                {link.label}
              </Link>
            ),
          )}
          <a
            href={otherLocaleHref}
            className={`${linkClass} font-semibold`}
            lang={locale === "he" ? "en" : "he"}
            hrefLang={locale === "he" ? "en" : "he"}
          >
            {t("nav.language")}
          </a>
        </nav>
      </div>
    </footer>
  )
}
