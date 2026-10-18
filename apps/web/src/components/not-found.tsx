import { Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { useLocale, translate } from "@/i18n"
import { SITE_NAME } from "@/lib/seo"
import { EnsureSiteLayout } from "./site-layout"

export function NotFound() {
  const locale = useLocale()
  // Fallback pages have no route head of their own, so the tab would keep the bare site name (WCAG 2.4.2).
  useEffect(() => {
    document.title = `${SITE_NAME} - ${translate(locale, "error.notFound")}`
  }, [locale])
  return (
    <EnsureSiteLayout>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl" aria-hidden="true">
          🚉
        </p>
        <h1 className="mt-4 text-3xl font-bold">{translate(locale, "error.notFound")}</h1>
        <p className="mt-2 max-w-md text-muted">{translate(locale, "error.notFoundText")}</p>
        <Link to="/{-$locale}" params={{ locale: locale === "he" ? undefined : "en" }} className="btn-primary mt-8">
          {translate(locale, "error.home")}
        </Link>
      </div>
    </EnsureSiteLayout>
  )
}
