import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { SITE_URL } from "./seo"

/**
 * Origin of the deployment serving (or showing) the page, for URLs that must resolve on this very host — a preview
 * deploy, a local dev server — rather than on the canonical site. Read off the request during SSR and off the
 * browser after that; the canonical origin when there is no request to read it from.
 */
export const requestOrigin = createIsomorphicFn()
  .server(() => {
    try {
      return new URL(getRequest().url).origin
    } catch {
      return SITE_URL
    }
  })
  .client(() => window.location.origin)
