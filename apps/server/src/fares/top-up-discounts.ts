/**
 * top-up-discounts.ts — single-ride discounts the rail API reports as 0.
 *
 * Israel Railways doesn't sell a discounted single ticket to youth, students,
 * the disabled and similar profiles: the ticket is full price and the discount
 * is applied at RavKav top-up (the API's footnote for these profiles says
 * exactly that). Its tariff table therefore lists their single-ride rate as 0,
 * which the app used to show as "full price". These are the rates riders
 * actually get, from the Ministry of Transport tariff as documented on
 * כל-זכות (kolzchut.org.il, "הנחה בתחבורה הציבורית ל…").
 *
 * A rate here only fills in a single-ride rate the rail API reports as 0; a
 * non-zero rate from the API always wins, so a reform they publish takes effect
 * on the next pull without touching this file. Daily and monthly passes are
 * contracts the rail API prices directly, and its 0 there is deliberate
 * (youth get no daily discount, senior women do).
 */
import { FarePrices } from "./types"

type SingleRideDiscount = {
  rate: number
  /** Given at RavKav top-up rather than on the ticket — the app explains this to the rider. */
  atTopUp: boolean
}

export const SINGLE_RIDE_DISCOUNTS: Record<number, SingleRideDiscount> = {
  // סטודנט מורחב: semester/annual pass holders; the pass itself is a bundle, not the monthly fare shown.
  3: { rate: 0.5, atTopUp: true },
  // נכה
  5: { rate: 0.5, atTopUp: true },
  // סטודנט רגיל
  19: { rate: 0.33, atTopUp: true },
  // ילד/נוער 5–18
  33: { rate: 0.5, atTopUp: true },
  // זכאי ביטוח לאומי
  40: { rate: 0.5, atTopUp: true },
  // נפגעי פעולות איבה
  41: { rate: 0.5, atTopUp: true },
  // מלווה לקוי ראיה: a discounted single ticket, bought while showing the blind person's RavKav.
  43: { rate: 0.5, atTopUp: false },
}

/** The rail API's rates with the single-ride discount filled in; `atTopUp` says whether one was and it is given at top-up. */
export const withTopUpDiscounts = (id: number, rates: FarePrices): { discounts: FarePrices; atTopUp: boolean } => {
  const extra = SINGLE_RIDE_DISCOUNTS[id]
  if (!extra || rates.single !== 0) return { discounts: rates, atTopUp: false }
  return { discounts: { ...rates, single: extra.rate }, atTopUp: extra.atTopUp }
}
