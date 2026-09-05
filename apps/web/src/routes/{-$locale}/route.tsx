import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { resolveLocale } from "@/i18n"
import { SiteLayout } from "@/components/site-layout"

/** Locale prefix layout: `/…` is Hebrew, `/en/…` English; any other first segment is a 404. */
export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params, location }) => {
    if (params.locale === "he") {
      throw redirect({ href: location.href.replace(/^\/he(?=\/|$|\?)/, "") || "/", replace: true })
    }
    const locale = resolveLocale(params.locale)
    if (!locale) throw notFound()
    return { locale }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useRouteContext()
  return (
    <SiteLayout locale={locale}>
      <Outlet />
    </SiteLayout>
  )
}
