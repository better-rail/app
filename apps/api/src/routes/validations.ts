import { ZodSchema, z } from "zod"
import { RideAlarmRequestSchema } from "../types/ride"

/** Zod-validated JSON body; `{ error: Response }` carries the 400 the Express validator sent. */
export const validateBody = <TBody>(schema: ZodSchema<TBody>, body: unknown): { data: TBody } | { error: Response } => {
  const result = schema.safeParse(body)
  if (!result.success) return { error: new Response("Body doesn't match schema", { status: 400 }) }
  return { data: result.data }
}

export const UpdateRideTokenBody = z.object({
  rideId: z.string().min(1),
  token: z.string().min(1),
})

export const DeleteRideBody = z.object({
  rideId: z.string().min(1),
})

export const SetRideAlarmBody = RideAlarmRequestSchema.extend({
  rideId: z.string().min(1),
})

export const RemoveRideAlarmBody = z.object({
  rideId: z.string().min(1),
})
