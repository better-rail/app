import { useEffect, useState } from "react"
import { naiveNow, type NaiveTime } from "@/lib/time"

/** Israel wall-clock time, refreshed every 30s. `initial` comes from the loader so SSR and first render match. */
export function useNow(initial: NaiveTime): NaiveTime {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    setNow(naiveNow())
    const interval = setInterval(() => setNow(naiveNow()), 30_000)
    return () => clearInterval(interval)
  }, [])
  return now
}
