import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { useLocale, translate } from "@/i18n"
import { EnsureSiteLayout } from "./site-layout"

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const locale = useLocale()
  const router = useRouter()
  // `reset` only clears the boundary; the match still holds the error, so the route has to load again as well.
  const tryAgain = () => {
    reset()
    router.invalidate()
  }
  return (
    <EnsureSiteLayout>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl">🚧</p>
        <h1 className="mt-4 text-3xl font-bold">{translate(locale, "error.generic")}</h1>
        <p className="mt-2 max-w-md text-muted">{translate(locale, "error.genericText")}</p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-full overflow-auto text-start text-xs text-danger">{String(error?.message)}</pre>
        )}
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn-secondary" onClick={tryAgain}>
            {translate(locale, "routes.tryAgain")}
          </button>
          <Link to="/{-$locale}" params={{ locale: locale === "he" ? undefined : "en" }} className="btn-primary">
            {translate(locale, "error.home")}
          </Link>
        </div>
      </div>
    </EnsureSiteLayout>
  )
}
