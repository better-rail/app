import { captureException } from "@sentry/cloudflare"
import { createMiddleware, createStart } from "@tanstack/react-start"

// TanStack Start answers errors thrown by server routes and server functions itself, so they never reach `withSentry`.
// Sentry's own middlewares would pull its Node SDK into the Worker and its whole browser SDK into the page.
const report = async <T>(next: () => T | Promise<T>) => {
  try {
    return await next()
  } catch (error) {
    captureException(error, { mechanism: { type: "auto.middleware.tanstackstart", handled: false } })
    throw error
  }
}

export const startInstance = createStart(() => ({
  requestMiddleware: [createMiddleware().server(({ next }) => report(next))],
  functionMiddleware: [createMiddleware({ type: "function" }).server(({ next }) => report(next))],
}))
