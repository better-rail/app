import type { useRouter } from "expo-router"

type Navigation = { canGoBack(): boolean; goBack(): void }

/**
 * Closes the whole voucher sheet. `router.dismiss()` would only pop the nested stack, which after
 * ordering still holds the phone step under the voucher. Opened from a link or restored after a
 * restart, the sheet can also be the only screen, so it falls back to home.
 */
export function closeVoucherFlow(sheetNavigation: Navigation | undefined, router: ReturnType<typeof useRouter>) {
  if (sheetNavigation?.canGoBack()) sheetNavigation.goBack()
  else router.replace("/")
}
