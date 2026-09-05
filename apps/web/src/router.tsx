import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "./routeTree.gen"
import { NotFound } from "./components/not-found"
import { ErrorPage } from "./components/error-page"
import { parseSearchValue } from "./lib/search"

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    parseSearch: parseSearchWith(parseSearchValue),
    stringifySearch: stringifySearchWith(JSON.stringify, parseSearchValue),
    scrollRestoration: true,
    // Restored and reset positions are jumps, not animations. Left to the default, the page's own
    // `scroll-behavior: smooth` turns a reload's restore into a scroll from the top that is still in flight when the
    // routes page positions itself — and WebKit does not abort it, so the page ends up somewhere in between.
    scrollRestorationBehavior: "instant",
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorPage,
    defaultStructuralSharing: true,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
