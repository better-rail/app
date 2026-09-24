/**
 * top-up-discounts.ts — discounts the rail API reports as 0 but riders get.
 *
 * Israel Railways doesn't sell a discounted single ticket to youth, students,
 * the disabled and similar profiles: the ticket is full price and the discount
 * arrives as bonus stored value at RavKav top-up (the API's footnote for these
 * profiles says exactly that). Its tariff table therefore lists their single
 * and daily rates as 0, which the app used to show as "full price". These
 * are the rates riders actually pay, from the Ministry of Transport tariff as
 * documented on כל-זכות (kolzchut.org.il, "הנחה בתחבורה הציבורית ל…").
 *
 * A rate here only fills in a product the rail API reports as 0; a non-zero
 * rate from the API always wins, so a reform they publish takes effect on the
 * next pull without touching this file. The daily pass is bought from the same
 * stored value, so it gets the single-ride rate.
 */
import { FarePrices } from "./types"

export const TOP_UP_DISCOUNTS: Record<number, Partial<FarePrices>> = {
  // סטודנט מורחב: semester/annual pass holders — 50% at top-up, 45–50% on the pass.
  3: { single: 0.5, daily: 0.5, monthly: 0.5 },
  // נכה
  5: { single: 0.5, daily: 0.5 },
  // סטודנט רגיל
  19: { single: 0.33, daily: 0.33 },
  // ילד/נוער 5–18
  33: { single: 0.5, daily: 0.5 },
  // זכאי ביטוח לאומי
  40: { single: 0.5, daily: 0.5 },
  // נפגעי פעולות איבה
  41: { single: 0.5, daily: 0.5 },
  // מלווה לקוי ראיה: 50% on a single ticket when riding with the blind person.
  43: { single: 0.5 },
}

/** The rail API's rates with the top-up discounts filled in; `applied` says whether any were. */
export const withTopUpDiscounts = (
  id: number,
  rates: FarePrices,
): { discounts: FarePrices; applied: boolean } => {
  const topUp = TOP_UP_DISCOUNTS[id]
  if (!topUp) return { discounts: rates, applied: false }
  const discounts = { ...rates }
  let applied = false
  for (const product of ["single", "daily", "monthly"] as const) {
    const rate = topUp[product]
    if (rate !== undefined && discounts[product] === 0) {
      discounts[product] = rate
      applied = true
    }
  }
  return { discounts, applied }
}
