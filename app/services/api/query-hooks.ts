import { useQuery, useQueryClient } from "react-query"

const

function getTrainRoutes(fetchRoutes) {
  // const queryClient = useQueryClient()

  return useQuery("todos", fetchRoutes)
}
