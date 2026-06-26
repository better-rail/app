// EXPO_PUBLIC_* vars are inlined from process.env by babel-preset-expo at build time.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_POSTHOG_API_KEY: string
  }
}
