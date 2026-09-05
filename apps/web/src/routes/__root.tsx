import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useMatches } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import appCss from "../styles.css?url"
import { defaultLocale, dir, htmlLang, isLocale, type Locale } from "@/i18n"
import { POSTHOG_SNIPPET } from "@/lib/analytics"
import { APP_STORE_ID, SITE_NAME } from "@/lib/seo"

interface RouterContext {
  queryClient: QueryClient
}

/** Applies the dark class before first paint so there is no flash; mirrors the OS setting live. */
const THEME_SCRIPT = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){document.documentElement.classList.toggle('dark',m.matches)};a();m.addEventListener('change',a)}catch(e){}})();`

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: SITE_NAME },
      { name: "theme-color", content: "#0a81dd" },
      { name: "apple-itunes-app", content: `app-id=${APP_STORE_ID}` },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preload", as: "font", type: "font/woff2", href: "/assets/fonts/Heebo.woff2", crossOrigin: "anonymous" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/assets/favicon/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/assets/favicon/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/assets/favicon/favicon-16x16.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [{ children: THEME_SCRIPT }, ...(import.meta.env.PROD ? [{ children: POSTHOG_SNIPPET }] : [])],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

/** The current locale is owned by the `{-$locale}` layout; the shell reads it off the matched routes. */
function useDocumentLocale(): Locale {
  const matches = useMatches()
  for (const match of matches) {
    const context = match.context as { locale?: unknown } | undefined
    if (context && isLocale(context.locale)) return context.locale
  }
  return defaultLocale
}

function RootDocument({ children }: { children: ReactNode }) {
  const locale = useDocumentLocale()
  return (
    <html lang={htmlLang(locale)} dir={dir(locale)} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
