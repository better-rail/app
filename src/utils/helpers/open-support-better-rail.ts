import { openLink } from "./open-link"

export const SUPPORT_BETTER_RAIL_URL = "https://pages.greeninvoice.co.il/payments/links/696f6413-1068-4002-a0f7-6b9b6676ead5"

export async function openSupportBetterRail() {
  await openLink(SUPPORT_BETTER_RAIL_URL)
}
