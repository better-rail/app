import type { LanguageCode } from "@/i18n/i18n"

/**
 * A rider's nickname: a random adjective + animal, like "The Punctual Pelican".
 * Each language has its own lists written to agree grammatically, so nothing is machine-translated.
 */

type Gender = "m" | "f" | "n"
type Noun = { word: string; emoji: string; gender: Gender }
type Adjective = Partial<Record<Gender, string>> & { m: string }

type Language = { nouns: Noun[]; adjectives: Adjective[]; compose: (adjective: string, noun: string) => string }

const en: Language = {
  compose: (adjective, noun) => `The ${adjective} ${noun}`,
  nouns: [
    { word: "Pelican", emoji: "🪿", gender: "m" },
    { word: "Snail", emoji: "🐌", gender: "m" },
    { word: "Sardine", emoji: "🐟", gender: "m" },
    { word: "Donkey", emoji: "🫏", gender: "m" },
    { word: "Owl", emoji: "🦉", gender: "m" },
    { word: "Hedgehog", emoji: "🦔", gender: "m" },
    { word: "Camel", emoji: "🐪", gender: "m" },
    { word: "Flamingo", emoji: "🦩", gender: "m" },
    { word: "Turtle", emoji: "🐢", gender: "m" },
    { word: "Fox", emoji: "🦊", gender: "m" },
    { word: "Penguin", emoji: "🐧", gender: "m" },
    { word: "Octopus", emoji: "🐙", gender: "m" },
    { word: "Goat", emoji: "🐐", gender: "m" },
    { word: "Hamster", emoji: "🐹", gender: "m" },
    { word: "Giraffe", emoji: "🦒", gender: "m" },
  ],
  adjectives: [
    { m: "Punctual" },
    { m: "Suspicious" },
    { m: "Dramatic" },
    { m: "Sleepy" },
    { m: "Menacing" },
    { m: "Elegant" },
    { m: "Restless" },
    { m: "Philosophical" },
    { m: "Mysterious" },
    { m: "Cheerful" },
    { m: "Stubborn" },
    { m: "Legendary" },
    { m: "Curious" },
    { m: "Unstoppable" },
    { m: "Dignified" },
    { m: "Hasty" },
  ],
}

const he: Language = {
  compose: (adjective, noun) => `ה${noun} ה${adjective}`,
  nouns: [
    { word: "שקנאי", emoji: "🪿", gender: "m" },
    { word: "חילזון", emoji: "🐌", gender: "m" },
    { word: "סרדין", emoji: "🐟", gender: "m" },
    { word: "חמור", emoji: "🫏", gender: "m" },
    { word: "ינשוף", emoji: "🦉", gender: "m" },
    { word: "קיפוד", emoji: "🦔", gender: "m" },
    { word: "גמל", emoji: "🐪", gender: "m" },
    { word: "פלמינגו", emoji: "🦩", gender: "m" },
    { word: "צב", emoji: "🐢", gender: "m" },
    { word: "שועל", emoji: "🦊", gender: "m" },
    { word: "פינגווין", emoji: "🐧", gender: "m" },
    { word: "תמנון", emoji: "🐙", gender: "m" },
    { word: "עז", emoji: "🐐", gender: "f" },
    { word: "ג׳ירפה", emoji: "🦒", gender: "f" },
    { word: "חסידה", emoji: "🪶", gender: "f" },
  ],
  adjectives: [
    { m: "דייקן", f: "דייקנית" },
    { m: "חשדן", f: "חשדנית" },
    { m: "דרמטי", f: "דרמטית" },
    { m: "מנומנם", f: "מנומנמת" },
    { m: "מאיים", f: "מאיימת" },
    { m: "אלגנטי", f: "אלגנטית" },
    { m: "קצר רוח", f: "קצרת רוח" },
    { m: "פילוסופי", f: "פילוסופית" },
    { m: "מסתורי", f: "מסתורית" },
    { m: "עליז", f: "עליזה" },
    { m: "עקשן", f: "עקשנית" },
    { m: "אגדי", f: "אגדית" },
    { m: "סקרן", f: "סקרנית" },
    { m: "בלתי נעצר", f: "בלתי נעצרת" },
    { m: "מכובד", f: "מכובדת" },
    { m: "ממהר", f: "ממהרת" },
  ],
}

const ru: Language = {
  compose: (adjective, noun) => `${adjective} ${noun}`,
  nouns: [
    { word: "Пеликан", emoji: "🪿", gender: "m" },
    { word: "Улитка", emoji: "🐌", gender: "f" },
    { word: "Сардина", emoji: "🐟", gender: "f" },
    { word: "Ослик", emoji: "🫏", gender: "m" },
    { word: "Сова", emoji: "🦉", gender: "f" },
    { word: "Ёжик", emoji: "🦔", gender: "m" },
    { word: "Верблюд", emoji: "🐪", gender: "m" },
    { word: "Фламинго", emoji: "🦩", gender: "m" },
    { word: "Черепаха", emoji: "🐢", gender: "f" },
    { word: "Лис", emoji: "🦊", gender: "m" },
    { word: "Пингвин", emoji: "🐧", gender: "m" },
    { word: "Осьминог", emoji: "🐙", gender: "m" },
    { word: "Коза", emoji: "🐐", gender: "f" },
    { word: "Хомяк", emoji: "🐹", gender: "m" },
    { word: "Жираф", emoji: "🦒", gender: "m" },
  ],
  adjectives: [
    { m: "Пунктуальный", f: "Пунктуальная" },
    { m: "Подозрительный", f: "Подозрительная" },
    { m: "Драматичный", f: "Драматичная" },
    { m: "Сонный", f: "Сонная" },
    { m: "Грозный", f: "Грозная" },
    { m: "Элегантный", f: "Элегантная" },
    { m: "Беспокойный", f: "Беспокойная" },
    { m: "Философский", f: "Философская" },
    { m: "Загадочный", f: "Загадочная" },
    { m: "Весёлый", f: "Весёлая" },
    { m: "Упрямый", f: "Упрямая" },
    { m: "Легендарный", f: "Легендарная" },
    { m: "Любопытный", f: "Любопытная" },
    { m: "Неудержимый", f: "Неудержимая" },
    { m: "Важный", f: "Важная" },
    { m: "Торопливый", f: "Торопливая" },
  ],
}

const ar: Language = {
  compose: (adjective, noun) => `ال${noun} ال${adjective}`,
  nouns: [
    { word: "بجعة", emoji: "🪿", gender: "f" },
    { word: "حلزون", emoji: "🐌", gender: "m" },
    { word: "سردينة", emoji: "🐟", gender: "f" },
    { word: "حمار", emoji: "🫏", gender: "m" },
    { word: "بومة", emoji: "🦉", gender: "f" },
    { word: "قنفذ", emoji: "🦔", gender: "m" },
    { word: "جمل", emoji: "🐪", gender: "m" },
    { word: "فلامنغو", emoji: "🦩", gender: "m" },
    { word: "سلحفاة", emoji: "🐢", gender: "f" },
    { word: "ثعلب", emoji: "🦊", gender: "m" },
    { word: "بطريق", emoji: "🐧", gender: "m" },
    { word: "أخطبوط", emoji: "🐙", gender: "m" },
    { word: "عنزة", emoji: "🐐", gender: "f" },
    { word: "هامستر", emoji: "🐹", gender: "m" },
    { word: "زرافة", emoji: "🦒", gender: "f" },
  ],
  adjectives: [
    { m: "دقيق", f: "دقيقة" },
    { m: "مريب", f: "مريبة" },
    { m: "درامي", f: "درامية" },
    { m: "ناعس", f: "ناعسة" },
    { m: "مهيب", f: "مهيبة" },
    { m: "أنيق", f: "أنيقة" },
    { m: "قلق", f: "قلقة" },
    { m: "فيلسوف", f: "فيلسوفة" },
    { m: "غامض", f: "غامضة" },
    { m: "مرح", f: "مرحة" },
    { m: "عنيد", f: "عنيدة" },
    { m: "أسطوري", f: "أسطورية" },
    { m: "فضولي", f: "فضولية" },
    { m: "لا يُوقف", f: "لا تُوقف" },
    { m: "وقور", f: "وقورة" },
    { m: "مستعجل", f: "مستعجلة" },
  ],
}

const languages: Record<LanguageCode, Language> = { en, he, ru, ar }

export const RIDER_NAME_COMBINATIONS = 15 * 16

export function randomRiderNameSeed() {
  return Math.floor(Math.random() * RIDER_NAME_COMBINATIONS)
}

/** The same seed gives the same animal in every language, with that language's own adjective */
export function riderName(seed: number, locale: LanguageCode) {
  const language = languages[locale] ?? en
  const noun = language.nouns[Math.abs(seed) % language.nouns.length]
  const adjective = language.adjectives[Math.floor(Math.abs(seed) / language.nouns.length) % language.adjectives.length]
  return {
    name: language.compose(adjective[noun.gender] ?? adjective.m, noun.word),
    emoji: noun.emoji,
  }
}
