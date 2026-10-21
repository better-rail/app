import { useQuery } from "react-query"
import { SIMULATE_SERVICE_STATUS } from "@/config/features"
import { serviceStatusApi, type ServiceStatusSnapshot } from "@/services/api"
import { simulatedServiceStatus } from "./simulated-service-status"

export const SERVICE_STATUS_QUERY_KEY = ["serviceStatus"]

/** The server's snapshot, or the made-up one while working on the screens with no trains running. */
const fetchServiceStatus = (): Promise<ServiceStatusSnapshot> =>
  SIMULATE_SERVICE_STATUS ? Promise.resolve(simulatedServiceStatus()) : serviceStatusApi.getServiceStatus()

type UseServiceStatusOptions = {
  /**
   * For the home screen's banner and icon, which only glance at the status: refreshed every few
   * minutes rather than every half minute. A status screen open at the same time still refreshes
   * the shared data at its own pace.
   */
  background?: boolean
}

/** The live status, refreshed every half minute while a status screen is open. */
export function useServiceStatus({ background = false }: UseServiceStatusOptions = {}) {
  return useQuery<ServiceStatusSnapshot>(SERVICE_STATUS_QUERY_KEY, fetchServiceStatus, {
    refetchInterval: background ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: true,
    staleTime: background ? 60_000 : 10_000,
    retry: 1,
  })
}
