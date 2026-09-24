import { isEmpty } from "lodash"
import winston from "winston"
import "winston-mongodb"

import { SentryTransport } from "../sentry"

export let logger: winston.Logger

// JSON.stringify turns an Error into `{}`, which hid every logged failure's cause.
const serializeErrors = (_key: string, value: unknown) =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value

export const startLogger = () => {
  logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
      winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
        return `${timestamp} ${level}: ${message} ${isEmpty(metadata) ? "" : "- " + JSON.stringify(metadata, serializeErrors)} ${
          isEmpty(stack) ? "" : "- " + stack
        }`
      }),
    ),
    transports: [new winston.transports.Console(), new SentryTransport()],
  })
}
