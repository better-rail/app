// EXPO_PUBLIC_* vars are inlined from process.env by babel-preset-expo at build time.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_POSTHOG_API_KEY: string
    EXPO_PUBLIC_E2E?: string
    EXPO_PUBLIC_ANALYTICS_IN_DEV?: string
    /** "local" points the app at `bun run dev` in apps/server. Anything else is production. */
    EXPO_PUBLIC_API_ENV?: string
    /** A full base URL (".../api/v1") that wins over EXPO_PUBLIC_API_ENV. */
    EXPO_PUBLIC_API_URL?: string
    /** "true" serves the made-up status snapshot in development builds. */
    EXPO_PUBLIC_SIMULATE_SERVICE_STATUS?: string
  }
}
