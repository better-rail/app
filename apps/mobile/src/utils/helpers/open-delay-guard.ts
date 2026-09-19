import { router } from "expo-router"
import { getStationById } from "@/data/stations"
import { useRoutePlanStore } from "@/models/route-plan/route-plan"
import { trackEvent } from "@/services/analytics"

/** The data a Delay Guard push carries (see apps/server/src/delay-guards/watcher.ts). */
export type DelayGuardPayload = {
  type: "delay-guard"
  trainNumber: string
  originStationId: string
  destinationStationId: string
}

export const isDelayGuardPayload = (data: unknown): data is DelayGuardPayload => {
  const d = data as Partial<DelayGuardPayload> | null | undefined
  return d?.type === "delay-guard" && typeof d.originStationId === "string" && typeof d.destinationStationId === "string"
}

/** A tapped Delay Guard push opens the trains from the boarding station to the destination, now. */
export const openDelayGuard = (payload: DelayGuardPayload) => {
  const origin = getStationById(payload.originStationId)
  const destination = getStationById(payload.destinationStationId)
  if (!origin || !destination) return
  trackEvent("delay_guard_opened", { trainNumber: payload.trainNumber })
  const plan = useRoutePlanStore.getState()
  plan.setOrigin(origin)
  plan.setDestination(destination)
  plan.setDate(new Date())
  router.navigate({
    pathname: "/route-list",
    params: { originId: origin.id, destinationId: destination.id, time: String(Date.now()), enableQuery: "true" },
  })
}
