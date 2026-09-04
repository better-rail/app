import { Link, type ErrorComponentProps } from "@tanstack/react-router"
import { useLocale, translate } from "@/i18n"
import { SiteLayout } from "./site-layout"

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const locale = useLocale()
  return (
    <SiteLayout locale={locale}>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl">🚧</p>
        <h1 className="mt-4 text-3xl font-bold">{translate(locale, "error.generic")}</h1>
        <p className="mt-2 max-w-md text-muted">{translate(locale, "error.genericText")}</p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-full overflow-auto text-start text-xs text-danger">{String(error?.message)}</pre>
        )}
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn-secondary" onClick={reset}>
            {translate(locale, "routes.tryAgain")}
          </button>
          <Link to="/{-$locale}" params={{ locale: locale === "he" ? undefined : "en" }} className="btn-primary">
            {translate(locale, "error.home")}
          </Link>
        </div>
      </div>
    </SiteLayout>
  )
}
