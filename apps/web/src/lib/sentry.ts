/** Errors go to the `better-rail/web` Sentry project. A DSN only allows sending events, so it can ship in the bundle. */
export const SENTRY_DSN = "https://1796965c0929965705e6f742824ec415@o4510306230534144.ingest.us.sentry.io/4512288506183680"

/** Branch previews share the production Worker's config, so the environment comes from the host the page was served on. */
export const sentryEnvironment = (hostname: string | undefined) =>
  hostname && /^(www\.)?better-rail\.co\.il$/.test(hostname) ? "production" : "preview"

let browserSdk: Promise<Pick<typeof import("@sentry/tanstackstart-react"), "captureException">> | undefined

/** Loads the browser SDK in its own chunk, so it stays out of the bundle the page needs to render. */
export function initBrowserSentry() {
  if (import.meta.env.SSR || !import.meta.env.PROD || browserSdk) return
  // Destructured so the bundler can leave out the integrations this doesn't use (replay, feedback, tracing).
  browserSdk = import("@sentry/tanstackstart-react").then(({ init, captureException }) => {
    init({ dsn: SENTRY_DSN, environment: sentryEnvironment(location.hostname) })
    return { captureException }
  })
}

export function reportError(error: unknown) {
  void browserSdk?.then(({ captureException }) => captureException(error))
}
