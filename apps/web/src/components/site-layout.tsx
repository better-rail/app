import type { ReactNode } from "react"
import { LocaleContext, type Locale } from "@/i18n"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"

export function SiteLayout({ locale, children, footer = true }: { locale: Locale; children: ReactNode; footer?: boolean }) {
  return (
    <LocaleContext.Provider value={locale}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        {footer && <SiteFooter />}
      </div>
    </LocaleContext.Provider>
  )
}
