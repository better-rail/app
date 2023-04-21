import { isEmpty } from "lodash"
import winston from "winston"
import "winston-mongodb"

import { mongoUrl } from "../data/config"

export let logger: winston.Logger

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
      }),
    ],
  })
}
