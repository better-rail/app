import { stations } from "./stations"

export const startButton = "conductor:start"
export const skipButton = "conductor:skip"
export const clearButton = "conductor:clear"
export const finishButton = "conductor:finish"
export const backButton = "conductor:back"
export const platformPrefix = "conductor:platform:"
export const searchPrefix = "conductor:search:"
export const queryPrefix = "conductor:query:"
export const resultPrefix = "conductor:result:"
export const removePrefix = "conductor:remove:"
export const queryInput = "station-query"
export const selectPrefix = "conductor:station:"
export const platforms = [
  { id: "ios", name: "ios", label: "אייפון", emoji: "🍎" },
  { id: "android", name: "android", label: "אנדרואיד", emoji: "🤖" },
]
export const stationPages = Array.from({ length: Math.ceil(stations.length / 25) }, (_, page) =>
  stations.slice(page * 25, (page + 1) * 25),
)

export function welcomeMessage() {
  return {
    content: "## ברוכים הבאים לדיסקורד של בטר רייל!\n\nלפני שאתם מצטרפים, יש לנו 2 שאלות קצרות",
    components: [
      {
        type: 1,
        components: [{ type: 2, style: 1, label: "המשך", custom_id: startButton }],
      },
    ],
  }
}

export function platformPicker() {
  return {
    content: "עם מה אתם נוסעים, אייפון או אנדרואיד?",
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

// Custom IDs carry the two draft station IDs through the search modal, without a database.
export function draftIds(state: string) {
  return [...new Set(state.split(","))].filter((id) => stations.some((station) => station.id === id)).slice(0, 2)
}

export function stationSearch(selected: string[]) {
  return {
    custom_id: queryPrefix + selected.join(","),
    title: "חיפוש תחנה",
    components: [
      {
        type: 18,
        label: "איזו תחנה אתם מחפשים?",
        description: "אפשר לכתוב בעברית או באנגלית",
        component: {
          type: 4,
          style: 1,
          custom_id: queryInput,
          placeholder: "למשל: השלום או hashalom",
          min_length: 1,
          max_length: 100,
          required: true,
        },
      },
    ],
  }
}

function normalize(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/ק(?:י)?רי{1,2}ת/g, "קריית")
    .replace(/[^a-z0-9\u05d0-\u05ea]/g, "")
}

function editDistance(left: string, right: string) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  let previousPrevious: number[] = []
  for (let row = 1; row <= left.length; row++) {
    const current = [row]
    for (let column = 1; column <= right.length; column++) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + Number(left[row - 1] !== right[column - 1]),
      )
      // Swapping adjacent letters is one typo, rather than two replacements.
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        current[column] = Math.min(current[column], previousPrevious[column - 2] + 1)
      }
    }
    previousPrevious = previous
    previous = current
  }
  return previous[right.length]
}

export function searchStations(query: string, selected: string[] = []) {
  const term = normalize(query)
  if (!term) return []
  const score = (name: string) => {
    const normalized = normalize(name)
    if (normalized === term) return 0
    if (normalized.includes(term)) {
      // Exact and substring matches always rank ahead of spelling corrections.
      return (normalized.startsWith(term) ? 1 : 2) + (normalized.length - term.length) / (normalized.length + 1)
    }
    if (term.length < 4) return Infinity
    // Compare full names, station portions after a city prefix, and individual words.
    const aliases = [name, ...name.split(/[-()]/), ...name.split(/\s+/)].map(normalize).filter(Boolean)
    const distance = Math.min(...aliases.map((alias) => editDistance(term, alias)))
    const tolerance = Math.min(2, Math.max(1, Math.floor(term.length / 5)))
    return distance <= tolerance ? 3 + distance / term.length : Infinity
  }
  return stations
    .map((station) => ({ station, score: Math.min(score(station.name), score(station.hebrew)) }))
    .filter((match) => Number.isFinite(match.score) && !selected.includes(match.station.id))
    .sort((a, b) => a.score - b.score)
    .map((match) => match.station)
}

export function stationPicker(
  selected: string[] = [],
  showFinish = selected.length > 0,
  matches: typeof stations = [],
  note = "",
) {
  const state = selected.join(",")
  const chosen = selected.map((id) => stations.find((station) => station.id === id)!)
  return {
    content:
      "## תחנה אהובה? · 2 / 2\nעכשיו בחרו תחנה אחת או שתיים שאהובות עליכם.\n\n**זה לא חובה :)**" +
      (chosen.length ? "\n\nבחרתם: " + chosen.map((station) => "`" + station.name + "`\n" + station.hebrew).join("\n\n") : "") +
      (note ? "\n\n" + note : ""),
    components: [
      ...(matches.length && selected.length < 2
        ? [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: resultPrefix + state,
                  placeholder: "בחרו תחנה",
                  min_values: 1,
                  max_values: 1,
                  options: matches.slice(0, 25).map((station) => ({
                    label: station.name,
                    value: station.id,
                    description: station.hebrew,
                  })),
                },
              ],
            },
          ]
        : []),
      {
        type: 1,
        components: [
          ...(selected.length < 2
            ? [{ type: 2, style: 1, label: selected.length ? "הוספת תחנה נוספת" : "חיפוש תחנה", custom_id: searchPrefix + state }]
            : []),
          ...(showFinish ? [{ type: 2, style: 1, label: "סיום", custom_id: finishButton + ":" + state }] : []),
          { type: 2, style: 2, label: "דילוג", custom_id: skipButton },
          { type: 2, style: 2, label: "חזרה אחורה", custom_id: backButton },
        ],
      },
      ...(chosen.length
        ? [
            {
              type: 1,
              components: chosen.map((station) => ({
                type: 2,
                style: 2,
                label: "הסרת " + station.name,
                custom_id: removePrefix + station.id + ":" + state,
              })),
            },
          ]
        : []),
    ],
  }
}

export function journeyComplete() {
  return {
    content:
      "## תודה רבה! 🙏\nאם יש לכם פידבק, רעיון או דיווח על באג, אנא השאירו אותו ב- <#1548778686671757373>\n\nלכל דבר אחר דברו איתנו ב- <#1548778257866817626>\n\nשתהיה נסיעה טובה 🚂",
    components: [],
  }
}
