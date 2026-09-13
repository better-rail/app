/**
 * Build-time switch used only by the dedicated Maestro build profile.
 *
 * Expo inlines EXPO_PUBLIC_* values into the JavaScript bundle. Keeping the switch
 * here makes it easy to audit the small number of test-only branches and ensures
 * production/development builds continue to use the real services and device locale.
 */
export const IS_E2E = process.env.EXPO_PUBLIC_E2E === "true"
