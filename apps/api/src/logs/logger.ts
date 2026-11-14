/**
 * logger.ts — the server's log, on console + Sentry.
 *
 * Same call sites as the Bun server's winston logger (`logger.info(name, meta)`,
 * `logger.child({ rideId })`); every `error` is also reported to Sentry
 * through sentry.ts, throttled per log site so one broken dependency doesn't
 * flood the quota. Workers Logs capture console output as structured events.
 */
import { isDeviceIdentityKey, reportError, scrubDeviceIdentity } from "../sentry"

type Meta = Record<string, unknown>

export type Logger = {
  info(message: string, meta?: Meta): void
  warn(message: string, meta?: Meta): void
  error(message: string, meta?: Meta): void
  child(bindings: Meta): Logger
}

const FILTERED = "[Filtered]"

// JSON.stringify turns an Error into `{}`, which would hide every logged failure's cause. A device's id, secret and
// push tokens never get printed, wherever they sit in the metadata (Workers Logs keep everything `console` prints).
const serialize = (key: string, value: unknown) => {
  if (key && isDeviceIdentityKey(key)) return FILTERED
  if (typeof value === "string") return scrubDeviceIdentity(value)
  return value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value
}

const format = (level: string, message: string, meta: Meta) => {
  const hasMeta = Object.keys(meta).length > 0
  const text = `${scrubDeviceIdentity(message)}${hasMeta ? " - " + JSON.stringify(meta, serialize) : ""}`
  return `${new Date().toISOString()} ${level}: ${text}`
}

const createLogger = (bindings: Meta = {}): Logger => ({
  info: (message, meta = {}) => console.log(format("info", message, { ...bindings, ...meta })),
  warn: (message, meta = {}) => console.warn(format("warn", message, { ...bindings, ...meta })),
  error: (message, meta = {}) => {
    const merged = { ...bindings, ...meta }
    console.error(format("error", message, merged))
    reportError(message, merged)
  },
  child: (extra) => createLogger({ ...bindings, ...extra }),
})

export const logger: Logger = createLogger()
