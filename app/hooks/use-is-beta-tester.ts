import { useEffect, useState } from "react"
import { useStores } from "../models"

export function useIsBetaTester() {
  const { purchases } = useStores()
  const [isBetaTester, setIsBetaTester] = useState(false)

  useEffect(() => {
    purchases.isBetaTester().then((result) => {
      setIsBetaTester(result)
    })
  }, [])

  return isBetaTester
}
