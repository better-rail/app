import { useQuery } from "react-query"
import { voucherApi, type Train } from "@/services/api"
import { getVoucherDate, isVoucherBookable } from "@/utils/helpers/voucher-helpers"

export const voucherConfigQueryKey = "voucherConfig"
export const voucherCapacityQueryKey = (date: string) => ["voucherCapacity", date]

/** Whether a Jerusalem voucher can be booked for a train right now, and how many seats it has left. */
export function useVoucherAvailability(train: Train | undefined) {
  const { data: config } = useQuery(voucherConfigQueryKey, () => voucherApi.getConfig(), {
    enabled: !!train,
    staleTime: 60 * 60 * 1000,
  })

  const date = train ? getVoucherDate(train) : ""
  const isBookable = !!train && !!config?.isActive && isVoucherBookable(train, config)

  const { data: capacity } = useQuery(voucherCapacityQueryKey(date), () => voucherApi.getRemainingCapacity(date), {
    enabled: isBookable,
    staleTime: 60_000,
  })

  const remaining = capacity?.find((entry) => entry.trainNumber === train?.trainNumber)?.remaining
  const lowThreshold = config ? (config.defaultTrainCapacity * config.lowCapacityPercent) / 100 : 0

  return {
    isBookable: isBookable && remaining !== 0,
    isSoldOut: isBookable && remaining === 0,
    remaining,
    isLow: remaining !== undefined && remaining > 0 && remaining <= lowThreshold,
  }
}
