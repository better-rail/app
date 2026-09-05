import { createContext, useContext, type ReactNode } from "react"
import { LocaleContext, useLocale, type Locale } from "@/i18n"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"

/** True while rendering inside a `SiteLayout`, so nested fallbacks (404 / error) don't add a second header and footer. */
const InsideSiteLayout = createContext(false)

export function SiteLayout({ locale, children, footer = true }: { locale: Locale; children: ReactNode; footer?: boolean }) {
  return (
    <LocaleContext.Provider value={locale}>
      <InsideSiteLayout.Provider value={true}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          {footer && <SiteFooter />}
        </div>
      </InsideSiteLayout.Provider>
    </LocaleContext.Provider>
  )
}

/**
 * Layout for the router's fallback pages (404 / error). The router renders them in place of whichever route failed:
 * that can be a layout route itself (`/foo`, nothing above draws the chrome) or a page nested under one
 * (`/routes/3100/3232`, the chrome is already there), so the layout is only added when it's missing.
 */
export function EnsureSiteLayout({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const insideLayout = useContext(InsideSiteLayout)
  if (insideLayout) return <>{children}</>
  return <SiteLayout locale={locale}>{children}</SiteLayout>
}
