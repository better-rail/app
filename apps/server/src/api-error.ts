import { randomUUID } from "node:crypto"
import * as Sentry from "@sentry/bun"
import type { ErrorRequestHandler, RequestHandler, Response } from "express"

import { logger, logNames } from "./logs"

export const REQUEST_ID_HEADER = "X-Request-Id"

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "RIDES_DISABLED"
  | "NO_ACTIVE_FEED"
  | "FARES_UNAVAILABLE"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_INVALID_RESPONSE"
  | "INTERNAL_ERROR"

export type ApiErrorInput = {
  status: number
  code: ApiErrorCode
  message: string
  retryable: boolean
  legacy?: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly retryable: boolean
  readonly legacy?: Record<string, unknown>

  constructor(input: ApiErrorInput) {
    super(input.message)
    this.name = "ApiError"
    this.status = input.status
    this.code = input.code
    this.retryable = input.retryable
    this.legacy = input.legacy
  }
}

const headerRequestId = (res: Response): string | undefined => {
  const value = res.getHeader(REQUEST_ID_HEADER)
  return typeof value === "string" ? value : undefined
}

export const getRequestId = (res: Response): string => {
  const local = res.locals?.requestId
  if (typeof local === "string" && REQUEST_ID_PATTERN.test(local)) return local
  const header = headerRequestId(res)
  return header && REQUEST_ID_PATTERN.test(header) ? header : randomUUID()
}

export const toApiError = (error: unknown): ApiErrorInput => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      legacy: error.legacy,
    }
  }

  const message = error instanceof Error ? error.message : ""
  const errorType = error && typeof error === "object" && "type" in error ? (error as { type?: unknown }).type : undefined
  if (errorType === "entity.parse.failed" || (error instanceof SyntaxError && "body" in error)) {
    return { status: 400, code: "VALIDATION_ERROR", message: "Request body is not valid JSON", retryable: false }
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || /timed? ?out/i.test(message))) {
    return { status: 504, code: "UPSTREAM_TIMEOUT", message: "The upstream service timed out", retryable: true }
  }

  return { status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred", retryable: true }
}

export const sendApiError = (res: Response, input: ApiErrorInput) => {
  if (res.headersSent) return
  const legacy = input.legacy ?? {}
  const requestId = getRequestId(res)
  res.locals.apiErrorCode = input.code
  res.status(input.status).json({
    ...legacy,
    error: typeof legacy.error === "string" ? legacy.error : input.message,
    code: input.code,
    message: input.message,
    requestId,
    retryable: input.retryable,
  })
}

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const provided = req.get("x-request-id")
  const requestId = provided && REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID()
  res.locals.requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)
  next()
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendApiError(res, { status: 404, code: "NOT_FOUND", message: "The requested resource was not found", retryable: false })
}

export const sentryErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  const input = toApiError(error)
  const requestId = getRequestId(res)
  Sentry.captureException(
    new ApiError({ status: input.status, code: input.code, message: input.message, retryable: input.retryable }),
    {
      tags: { code: input.code, status: String(input.status) },
      extra: { requestId },
    },
  )
  next(new ApiError({ status: input.status, code: input.code, message: input.message, retryable: input.retryable }))
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  const input = toApiError(error)
  const requestId = getRequestId(res)
  logger?.error(logNames.api.requestFailed, { requestId, code: input.code, status: input.status, retryable: input.retryable })
  sendApiError(res, input)
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    void (async () => {
      try {
        await handler(req, res, next)
      } catch (error) {
        next(error)
      }
    })()
  }
}
