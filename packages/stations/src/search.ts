import Fuse from "fuse.js"
import { stations, type Station } from "./index"

// Standard Hebrew keyboard (SI-1452): each Hebrew character → the Latin key it sits on.
const hebrewToLatinKey: Record<string, string> = {
  ק: "e",
  ר: "r",
  א: "t",
  ט: "y",
  ו: "u",
  ן: "i",
  ם: "o",
  פ: "p",
  ש: "a",
  ד: "s",
  ג: "d",
  כ: "f",
  ע: "g",
  י: "h",
  ח: "j",
  ל: "k",
  ך: "l",
  ף: ";",
  ז: "z",
  ס: "x",
  ב: "c",
  ה: "v",
  נ: "b",
  מ: "n",
  צ: "m",
  ת: ",",
  ץ: ".",
  "'": "w",
  ".": "/",
}

/** What typing `text` with the keyboard left on English produces, e.g. "השלום" → "vakuo". */
export function hebrewToQwerty(text: string): string {
  return Array.from(text, (char) => hebrewToLatinKey[char] ?? char).join("")
}

const hasHebrew = (text: string) => /\p{Script=Hebrew}/u.test(text)

export type StationSearch<T extends Station = Station> = Fuse<T>

/** Fuzzy search over every station name and alias, plus the Hebrew names as typed on an English keyboard. */
export function createStationSearch<T extends Station = Station>(list: readonly T[] = stations as T[]): StationSearch<T> {
  return new Fuse(list, {
    keys: [
      { name: "hebrew", weight: 2 },
      { name: "english", weight: 2 },
      "alias",
      "russian",
      "arabic",
      {
        name: "hebrewQwerty",
        getFn: (station) => [station.hebrew, ...(station.alias ?? []).filter(hasHebrew)].map(hebrewToQwerty),
      },
    ],
    threshold: 0.32,
    ignoreLocation: true,
  })
}
