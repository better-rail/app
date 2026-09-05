import { Link } from "@tanstack/react-router"
import { useT } from "@/i18n"
import { trackEvent } from "@/lib/analytics"
import { GITHUB_URL, SUPPORT_URL, TWITTER_URL } from "@/lib/seo"
import { LocaleLink } from "./locale-link"
import { DownloadBadges } from "./download-badges"
import { GithubIcon, XIcon } from "./icons"

export function SiteFooter() {
  const t = useT()
  const links = [
    { to: "/about", label: t("footer.about") },
    { to: "/press", label: t("footer.press") },
    { to: "/israel-railways-lawsuit", label: t("footer.lawsuit") },
    { to: "/image-attributions", label: t("footer.attributions") },
    { to: "/terms", label: t("footer.terms") },
    { to: "/contact", label: t("footer.contact") },
  ]

  return (
    <footer className="mt-auto border-t border-line/70 bg-surface-2">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-lg font-bold">
            <img src="/assets/images/icon.svg" alt="" className="h-7 w-auto" width={50} height={60} />
            Better Rail
          </div>
          <DownloadBadges size="sm" />
        </div>

        <nav className="flex flex-col gap-2 text-[15px]" aria-label={t("footer.about")}>
          <LocaleLink to="/{-$locale}/privacy-policy" className="link-underline w-fit text-text-2 hover:text-text">
            {t("footer.privacy")}
          </LocaleLink>
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="link-underline w-fit text-text-2 hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-start gap-4">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("support_click")}
            className="btn-primary rounded-full px-6"
          >
            {t("footer.support")} 💙
          </a>
          <div className="flex items-center gap-2">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label={t("footer.github")}>
              <GithubIcon className="size-5" />
            </a>
            <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label={t("footer.twitter")}>
              <XIcon className="size-[18px]" />
            </a>
          </div>
          <p className="text-[13px] text-dim">{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  )
}
