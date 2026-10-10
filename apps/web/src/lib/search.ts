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
  if (!value.startsWith("{") && !value.startsWith("[")) throw NOT_JSON
  return JSON.parse(value)
}

/**
 * One instance for every rejection: the router's stringifier probes each value of each link it builds this way, and
 * a page listing a couple of hundred trips had it capturing a stack trace per value on every navigation.
 */
const NOT_JSON = new Error("Not a JSON search value")
