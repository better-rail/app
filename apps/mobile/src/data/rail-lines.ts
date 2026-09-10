import type { LanguageCode } from "@/i18n"

/**
 * The Israel Railways line catalogue shown on the Service Status screens.
 *
 * Israel Railways publishes no official line numbering, so this follows the
 * community "Line Explorer" map built from the MOT GTFS feed: fourteen marketing
 * lines, each with a badge number, a colour and its ordered station corridor.
 * The server groups live trains with the same catalogue
 * (apps/server/src/status/lines.ts) — ids, badges and colours must stay in sync.
 *
 * Generated from the Line Explorer export — regenerate rather than hand-edit.
 */

export type RailLineId = "1" | "2" | "3" | "3X" | "4" | "5" | "25" | "6" | "7" | "12" | "9" | "10" | "11" | "8"

export type RailLine = {
  id: RailLineId
  /** The number shown in the line's badge (the catalogue id is not always the public number). */
  badge: string
  /** Plain hex strings: they feed Skia and reanimated, which cannot consume PlatformColor. */
  color: string
  textColor: string
  badgeStyle: "solid" | "outline"
  name: Record<LanguageCode, string>
  /** Ordered corridor, first terminus to last, as "3700"-style station ids. */
  stationIds: string[]
}

export const RAIL_LINES: RailLine[] = [
  {
    id: "1",
    badge: "1",
    color: "#B1DB1F",
    textColor: "#363942",
    badgeStyle: "solid",
    name: { he: "נהריה – מודיעין", en: "Nahariya – Modi'in", ru: "Нагария – Модиин", ar: "نهاريا – موديعين" },
    stationIds: [
      "1600",
      "1500",
      "1400",
      "700",
      "1300",
      "1220",
      "2100",
      "2200",
      "2300",
      "2500",
      "2800",
      "2820",
      "3100",
      "3300",
      "3400",
      "3500",
      "3600",
      "3700",
      "4600",
      "4900",
      "8600",
      "300",
      "400",
    ],
  },
  {
    id: "2",
    badge: "2",
    color: "#0083CD",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "בנימינה – אשקלון", en: "Binyamina – Ashkelon", ru: "Биньямина – Ашкелон", ar: "بنيامينا – أشكلون" },
    stationIds: [
      "2800",
      "2820",
      "3100",
      "3300",
      "3310",
      "3400",
      "3500",
      "3600",
      "3700",
      "4600",
      "4900",
      "4800",
      "5150",
      "5000",
      "5300",
      "5200",
      "5410",
      "5800",
      "5900",
    ],
  },
  {
    id: "3",
    badge: "3",
    color: "#1BC741",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "נהריה – באר שבע", en: "Nahariya – Be'er Sheva", ru: "Нагария – Беэр-Шева", ar: "نهاريا – بئر السبع" },
    stationIds: [
      "1600",
      "1500",
      "1400",
      "700",
      "1300",
      "1220",
      "2100",
      "2200",
      "2300",
      "2500",
      "2800",
      "3500",
      "3600",
      "3700",
      "4600",
      "4900",
      "5000",
      "5010",
      "6900",
      "6150",
      "7000",
      "8550",
      "7300",
      "7320",
    ],
  },
  {
    id: "3X",
    badge: "34",
    color: "#FF7A00",
    textColor: "#FFFFFF",
    badgeStyle: "outline",
    name: { he: "כרמיאל – באר שבע", en: "Karmiel – Be'er Sheva", ru: "Кармиэль – Беэр-Шева", ar: "كرميئيل – بئر السبع" },
    stationIds: [
      "1840",
      "1820",
      "1400",
      "1220",
      "2100",
      "2200",
      "2300",
      "3100",
      "3500",
      "3600",
      "3700",
      "4600",
      "4900",
      "5000",
      "7000",
      "8550",
      "7300",
      "7320",
    ],
  },
  {
    id: "4",
    badge: "4",
    color: "#FF0099",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "כרמיאל – חיפה", en: "Karmiel – Haifa", ru: "Кармиэль – Хайфа", ar: "كرميئيل – حيفا" },
    stationIds: ["1840", "1820", "1400", "700", "1300", "1220", "2100", "2200", "2300"],
  },
  {
    id: "5",
    badge: "5",
    color: "#37C3FF",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "נתניה – בית שמש", en: "Netanya – Bet Shemesh", ru: "Нетания – Бейт-Шемеш", ar: "نتانيا – بيت شيمش" },
    stationIds: ["3300", "3400", "3500", "3600", "3700", "4600", "4900", "5150", "5000", "5010", "6300"],
  },
  {
    id: "25",
    badge: "25",
    color: "#37C3FF",
    textColor: "#FFFFFF",
    badgeStyle: "outline",
    name: { he: "נתניה – רחובות", en: "Netanya – Rehovot", ru: "Нетания – Реховот", ar: "نتانيا – رحوڤوت" },
    stationIds: ["3300", "3400", "3500", "3600", "3700", "4600", "4900", "5150", "5000", "5200"],
  },
  {
    id: "6",
    badge: "6",
    color: "#EC0000",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "הרצליה – באר שבע", en: "Herzliya – Be'er Sheva", ru: "Герцлия – Беэр-Шева", ar: "هرتسليا – بئر السبع" },
    stationIds: [
      "3500",
      "2940",
      "2960",
      "9200",
      "8700",
      "8800",
      "4250",
      "4170",
      "4100",
      "3600",
      "3700",
      "4600",
      "4900",
      "4640",
      "4660",
      "4680",
      "4690",
      "9800",
      "9000",
      "5800",
      "5900",
      "9600",
      "9650",
      "9700",
      "7300",
      "7320",
    ],
  },
  {
    id: "7",
    badge: "7",
    color: "#FF5FBF",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "הרצליה – ירושלים", en: "Herzliya – Jerusalem", ru: "Герцлия – Иерусалим", ar: "هرتسليا – أورشليم" },
    stationIds: ["3500", "3600", "3700", "4600", "4900", "8600", "680"],
  },
  {
    id: "12",
    badge: "8",
    color: "#00A6A6",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: {
      he: "חדרה מזרח – ראש העין",
      en: "Hadera East – Rosh Ha'Ayin",
      ru: "Хадера-Восток – Рош-ха-Аин",
      ar: "حديرا شرق – روش هعاين",
    },
    stationIds: ["3900", "4300", "4310", "8800"],
  },
  {
    id: "9",
    badge: "9",
    color: "#D176FF",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "לוד – ראשון לציון", en: "Lod – Rishon LeTsiyon", ru: "Лод – Ришон-ле-Цион", ar: "اللد – ريشون لتسيون" },
    stationIds: ["5000", "9100"],
  },
  {
    id: "10",
    badge: "10",
    color: "#D176FF",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "מודיעין – ירושלים", en: "Modi'in – Jerusalem", ru: "Модиин – Иерусалим", ar: "موديعين – أورشليم" },
    stationIds: ["400", "300", "680"],
  },
  {
    id: "11",
    badge: "11",
    color: "#D176FF",
    textColor: "#FFFFFF",
    badgeStyle: "solid",
    name: { he: "בית שאן – עתלית", en: "Beit She'an – Atlit", ru: "Бейт-Шеан – Атлит", ar: "بيت شآن – عتليت" },
    stationIds: ["1280", "1260", "1250", "1240", "1220", "2100", "2200", "2300", "2500"],
  },
  {
    id: "8",
    badge: "12",
    color: "#D176FF",
    textColor: "#FFFFFF",
    badgeStyle: "outline",
    name: { he: "באר שבע – דימונה", en: "Be'er Sheva – Dimona", ru: "Беэр-Шева – Димона", ar: "بئر السبع – ديمونا" },
    stationIds: ["7300", "7500"],
  },
]

export const RAIL_LINE_IDS: RailLineId[] = RAIL_LINES.map((line) => line.id)

const linesById = new Map<string, RailLine>(RAIL_LINES.map((line) => [line.id, line]))

export function getRailLine(lineId: string): RailLine | undefined {
  return linesById.get(lineId)
}
