import { ZodSchema, z } from "zod"
import { RequestHandler } from "express"
import { ParamsDictionary } from "express-serve-static-core"

import { sendApiError } from "../api-error"

export const bodyValidator: <TBody>(zodSchema: ZodSchema<TBody>) => RequestHandler<ParamsDictionary, any, TBody, any> =
  (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return sendApiError(res, {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Request body does not match the expected schema",
        retryable: false,
        legacy: { error: "Body doesn't match schema" },
      })
    }

    req.body = result.data
    next()
  }

export const UpdateRideTokenBody = z.object({
  rideId: z.string().min(1),
  token: z.string().min(1),
})

export const DeleteRideBody = z.object({
  rideId: z.string().min(1),
})
