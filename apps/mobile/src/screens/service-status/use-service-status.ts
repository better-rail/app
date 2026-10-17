import { useQuery } from "react-query"
import { SIMULATE_SERVICE_STATUS } from "@/config/features"
import { serviceStatusApi, type ServiceStatusSnapshot } from "@/services/api"
import { simulatedServiceStatus } from "./simulated-service-status"

export const SERVICE_STATUS_QUERY_KEY = ["serviceStatus"]

/** The server's snapshot, or the made-up one while working on the screens with no trains running. */
const fetchServiceStatus = (): Promise<ServiceStatusSnapshot> =>
  SIMULATE_SERVICE_STATUS ? Promise.resolve(simulatedServiceStatus()) : serviceStatusApi.getServiceStatus()

/** The live status, refreshed every half minute while a status screen is open. */
export function useServiceStatus() {
  return useQuery<ServiceStatusSnapshot>(SERVICE_STATUS_QUERY_KEY, fetchServiceStatus, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: 1,
  })
}
