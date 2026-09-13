import { useEffect, useState } from "react"

/**
 * The current time, re-read at the start of every minute so countdowns such as "in 12 min" stay
 * true while a screen sits open. The value is a plain `Date`; convert it for Israel's clock yourself.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = new Date()
      setNow(current)
      timer = setTimeout(tick, 60_000 - (current.getTime() % 60_000))
    }
    timer = setTimeout(tick, 60_000 - (now.getTime() % 60_000))
    return () => clearTimeout(timer)
    // The first delay comes from the initial `now`; later ones are re-derived on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return now
}
