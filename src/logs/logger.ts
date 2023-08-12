import { isEmpty } from "lodash"
import winston, { format } from "winston"
import "winston-mongodb"

import { mongoUrl } from "../data/config"
import { mapKeysDeep } from "../utils/lodash-utils"

export let logger: winston.Logger

const serializeObjects = format((info) => {
  const metadata = mapKeysDeep(info.metadata, (value, key) => {
    if (key.includes(".")) {
      return key.replace(/\./g, "_")
    }

    return key
  })

  return { info, ...metadata }
})

export const startLogger = () => {
  logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
      winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
        return `${timestamp} ${level}: ${message} ${isEmpty(metadata) ? "" : "- " + JSON.stringify(metadata)} ${
          isEmpty(stack) ? "" : "- " + stack
        }`
      }),
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.MongoDB({
        db: mongoUrl,
        dbName: "logs",
        format: serializeObjects(),
      }),
    ],
  })
}
