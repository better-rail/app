import { ZodSchema, z } from "zod"
import { RequestHandler } from "express"
import { ParamsDictionary } from "express-serve-static-core"

export const bodyValidator: <TBody>(zodSchema: ZodSchema<TBody>) => RequestHandler<ParamsDictionary, any, TBody, any> =
  (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).send("Body doesn't match schema")
    }

    req.body = result.data
    next()
  }

export const UpdateRideTokenBody = z.object({
  rideId: z.string(),
  token: z.string(),
})

export const DeleteRideBody = z.object({
  rideId: z.string(),
})
