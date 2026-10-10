import { useEffect, useState } from "react"

/**
 * The current time, re-read at the start of every minute so countdowns such as "in 12 min" stay
 * true while a screen sits open. The value is a plain `Date`; convert it for Israel's clock yourself.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(
        () => {
          setNow(new Date())
          schedule()
        },
        60_000 - (Date.now() % 60_000),
      )
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  return now
}
