import { Link } from "@tanstack/react-router"
import { useLocale, translate } from "@/i18n"
import { SiteLayout } from "./site-layout"

export function NotFound() {
  const locale = useLocale()
  return (
    <SiteLayout locale={locale}>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl">🚉</p>
        <h1 className="mt-4 text-3xl font-bold">{translate(locale, "error.notFound")}</h1>
        <p className="mt-2 max-w-md text-muted">{translate(locale, "error.notFoundText")}</p>
        <Link to="/{-$locale}" params={{ locale: locale === "he" ? undefined : "en" }} className="btn-primary mt-8">
          {translate(locale, "error.home")}
        </Link>
      </div>
    </SiteLayout>
  )
}
