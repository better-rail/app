import { RoutesNotFoundError } from "@/models/train-routes/search-routes"

// "No routes found" is an expected, app-handled outcome: the route list shows its own
// empty state for it. It's thrown only to drive react-query's onError, so it's not a bug.
// The name/message fallback also covers errors whose prototype chain was lost, and the plain
// `Error("Not found")` older bundles threw before RoutesNotFoundError existed.
export function isExpectedQueryOutcome(error: unknown): boolean {
  if (error instanceof RoutesNotFoundError) return true
  if (typeof error !== "object" || error === null) return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  return name === "RoutesNotFoundError" || message === "Not found"
}
