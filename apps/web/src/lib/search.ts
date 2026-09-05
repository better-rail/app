/**
 * The router decodes a bare numeric search value as a number (`?trip=785` → `785`), so ids that happen to be all
 * digits — station ids, train numbers — have to be read back as strings.
 */
export function searchString(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

/**
 * The router's default serialiser JSON-encodes any string that would otherwise parse as something else, which turns
 * a trip id like `785` into `%22785%22`. Every search param on this site is a plain string, so JSON is reserved for
 * objects and arrays — throwing for anything else is what keeps those values bare on both sides of the round trip.
 */
export function parseSearchValue(value: string): unknown {
  if (!value.startsWith("{") && !value.startsWith("[")) throw new Error("Not a JSON search value")
  return JSON.parse(value)
}
