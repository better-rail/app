import { useQuery } from "react-query"
import { serviceStatusApi, type ServiceStatusSnapshot } from "@/services/api"

export const SERVICE_STATUS_QUERY_KEY = ["serviceStatus"]

/** The live status, refreshed every half minute while a status screen is open. */
export function useServiceStatus() {
  return useQuery<ServiceStatusSnapshot>(SERVICE_STATUS_QUERY_KEY, () => serviceStatusApi.getServiceStatus(), {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: 1,
  })
}
