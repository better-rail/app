import dayjs from "dayjs"
import { compact } from "lodash"

type LogLevel = "INFO" | "SUCCESS" | "FAILED"

class Logger {
  private log(level: LogLevel, message: string, params?: Record<string, unknown>) {
    const logFn = level === "FAILED" ? console.error : console.log
    const date = dayjs().format("YYYY-MM-DD HH:mm.sss")

    if (params?.error instanceof Error) {
      params.error = params.error.message
    }

    const log = compact([level, date, message, JSON.stringify(params)])

    logFn(log.join(" | "))
  }

  info(message: string, params?: Record<string, unknown>) {
    this.log("INFO", message, params)
  }

  success(message: string, params?: Record<string, unknown>) {
    this.log("SUCCESS", message, params)
  }

  failed(message: string, params?: Record<string, unknown>) {
    this.log("FAILED", message, params)
  }
}

export const logger = new Logger()
