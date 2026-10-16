import { useFeatureFlag } from "posthog-react-native"

/** Kill switch for ordering Jerusalem vouchers. On unless the "jerusalem-vouchers" flag explicitly evaluates to false. */
export function useVouchersEnabled() {
  return useFeatureFlag("jerusalem-vouchers") !== false
}
