/**
 * client.ts — HTTP client for the MOT SIRI-SM v2.8 Stop Monitoring API.
 *
 * The API is SIRI-Lite (plain HTTP GET) gated by an IP allow-list + Key. Two
 * protocol rules are enforced structurally here: only ONE parameter may carry
 * multiple comma-separated values (MonitoringRef is ours; we never send another
 * multi-valued param), and errors come back inside the response body
 * (StopMonitoringDelivery.ErrorCondition), not as HTTP status codes.
 *
 * The access key must never reach logs — redactKey() is applied to every error
 * path that could embed the request URL.
 */
import { siriCaPem, siriKey, siriPreviewInterval, siriTlsInsecure, siriUrl } from "../data/config"
import { NormalizedVisit } from "./types"

const REQUEST_TIMEOUT_MS = 15_000

// moran.mot.gov.il's chain is missing its intermediate cert, so default
// verification fails. Bun's fetch takes per-request TLS options: trust the
// operator-provided chain (SIRI_CA_PEM) or, as a last resort, skip
// verification for SIRI requests only (SIRI_TLS_INSECURE) — never globally.
const tlsOptions = (): Record<string, unknown> | undefined => {
  if (siriCaPem) return { ca: siriCaPem }
  if (siriTlsInsecure) return { rejectUnauthorized: false }
  return undefined
}

type UrlOptions = { url?: string; key?: string; preview?: string }

export const buildStopMonitoringUrl = (stopCodes: string[], opts: UrlOptions = {}): string => {
  if (stopCodes.length === 0) throw new Error("buildStopMonitoringUrl: stopCodes must not be empty")
  const url = opts.url ?? siriUrl
  const key = opts.key ?? siriKey
  const preview = opts.preview ?? siriPreviewInterval
  return `${url}/json?Key=${key}&MonitoringRef=${stopCodes.join(",")}&PreviewInterval=${preview}`
}

export const redactKey = (text: string): string => text.replace(/Key=[^&\s]*/gi, "Key=***")

/** SIRI-Lite ref fields arrive as strings, numbers or `{ value }` wrappers. */
export const refValue = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined
  if (typeof v === "string") return v || undefined
  if (typeof v === "number") return String(v)
  if (typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return refValue((v as Record<string, unknown>).value)
  }
  return undefined
}

/** Single-element containers may be plain objects rather than arrays. */
const asArray = <T>(v: T | T[] | undefined | null): T[] => (Array.isArray(v) ? v : v == null ? [] : [v])

const normalizeVisit = (visit: any): NormalizedVisit | null => {
  const journey = visit?.MonitoredVehicleJourney
  const monitoringRef = refValue(visit?.MonitoringRef)
  if (!journey || !monitoringRef) return null

  const call = journey.MonitoredCall
  const lon = Number(refValue(journey.VehicleLocation?.Longitude))
  const lat = Number(refValue(journey.VehicleLocation?.Latitude))

  return {
    monitoringRef,
    lineRef: refValue(journey.LineRef),
    directionRef: refValue(journey.DirectionRef),
    dataFrameRef: refValue(journey.FramedVehicleJourneyRef?.DataFrameRef),
    datedVehicleJourneyRef: refValue(journey.FramedVehicleJourneyRef?.DatedVehicleJourneyRef),
    publishedLineName: refValue(journey.PublishedLineName),
    originRef: refValue(journey.OriginRef),
    destinationRef: refValue(journey.DestinationRef),
    originAimedDeparture: refValue(journey.OriginAimedDepartureTime),
    vehicleRef: refValue(journey.VehicleRef),
    location: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined,
    expectedArrival: refValue(call?.ExpectedArrivalTime),
    aimedArrival: refValue(call?.AimedArrivalTime),
    arrivalStatus: refValue(call?.ArrivalStatus),
    arrivalPlatform: refValue(call?.ArrivalPlatformName),
  }
}

export const parseStopMonitoringResponse = (body: unknown): { visits: NormalizedVisit[]; errors: string[] } => {
  const deliveries = asArray((body as any)?.Siri?.ServiceDelivery?.StopMonitoringDelivery)
  const visits: NormalizedVisit[] = []
  const errors: string[] = []

  for (const delivery of deliveries) {
    const errorText =
      refValue((delivery as any)?.ErrorCondition?.OtherError?.ErrorText) ??
      refValue((delivery as any)?.ErrorCondition?.Description)
    if (errorText) errors.push(errorText)

    for (const visit of asArray((delivery as any)?.MonitoredStopVisit)) {
      const normalized = normalizeVisit(visit)
      if (normalized) visits.push(normalized)
    }
  }

  return { visits, errors }
}

export const fetchStopMonitoring = async (
  stopCodes: string[],
): Promise<{ visits: NormalizedVisit[]; errors: string[]; rawBody: string }> => {
  const url = buildStopMonitoringUrl(stopCodes)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, tls: tlsOptions() } as RequestInit)
    const rawBody = await res.text()
    if (!res.ok) {
      throw new Error(`SIRI responded ${res.status}: ${rawBody.slice(0, 300)}`)
    }
    const { visits, errors } = parseStopMonitoringResponse(JSON.parse(rawBody))
    return { visits, errors, rawBody }
  } catch (error) {
    throw new Error(redactKey(String((error as Error)?.message ?? error)))
  } finally {
    clearTimeout(timeout)
  }
}
