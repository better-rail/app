import { stations } from "./stations"

export const startButton = "conductor:start"
export const skipButton = "conductor:skip"
export const clearButton = "conductor:clear"
export const platformPrefix = "conductor:platform:"
export const selectPrefix = "conductor:station:"
export const platforms = [
  { id: "ios", name: "ios", label: "iOS", emoji: "🍎" },
  { id: "android", name: "android", label: "Android", emoji: "🤖" },
]

export function welcomeMessage() {
  return {
    content:
      "## כרטיסים, בבקשה 🚂\nברוכים הבאים ל־Better Rail. לפני שיוצאים, שתי שאלות קצרות.\n\n**1.** iOS או Android?\n**2.** תחנה אהובה — רק אם בא לכם.\n\nהבחירות יופיעו בפרופיל שלכם. אפשר לשנות אותן מתי שרוצים.",
    components: [
      {
        type: 1,
        components: [{ type: 2, style: 1, label: "יאללה, עולים", emoji: { name: "🎟️" }, custom_id: startButton }],
      },
    ],
  }
}

export function platformPicker() {
  return {
    content: "## קודם, הטלפון · 1 / 2\nעם מה אתם נוסעים — **iOS** או **Android**?\nבחרו אחד כדי להמשיך.",
    components: [
      {
        type: 1,
        components: platforms.map((platform) => ({
          type: 2,
          style: 1,
          label: platform.label,
          emoji: { name: platform.emoji },
          custom_id: platformPrefix + platform.id,
        })),
      },
    ],
  }
}

export function stationPicker(platformLabel: string) {
  const pages = Array.from({ length: Math.ceil(stations.length / 25) }, (_, page) => stations.slice(page * 25, (page + 1) * 25))
  return {
    content: `## תחנה אהובה? · 2 / 2\nרשמתי: **${platformLabel}**. עכשיו בחרו תחנה שתופיע בפרופיל שלכם.\n\n**לא חובה.** אין על זה קנס.`,
    components: [
      ...pages.map((page, index) => ({
        type: 1,
        components: [
          {
            type: 3,
            custom_id: selectPrefix + index,
            placeholder: `בחרו תחנה (${index + 1}/${pages.length})`,
            options: page.map((station) => ({ label: station.name, value: station.id, description: station.hebrew })),
          },
        ],
      })),
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: "נדלג בינתיים", custom_id: skipButton },
          { type: 2, style: 2, label: "לשנות טלפון", custom_id: startButton },
        ],
      },
    ],
  }
}

export function journeyComplete(platformLabel: string, stationName?: string, skipped = false) {
  return {
    content: `## סגור, אפשר לנסוע 🚂\n**טלפון:** ${platformLabel}\n${stationName ? `**תחנה:** ${stationName}` : skipped ? "בלי תחנה אהובה בינתיים. אפשר לבחור בהמשך." : "הסרתי את התחנה מהפרופיל."}\n\nמחכים לכם ב־<#1548778257866817626>.`,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: "לשנות את הבחירות", custom_id: startButton },
          ...(stationName ? [{ type: 2, style: 2, label: "להסיר את התחנה", custom_id: clearButton }] : []),
        ],
      },
    ],
  }
}
