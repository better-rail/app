import { useSyncExternalStore } from "react"

/** One `MediaQueryList` per query: `getSnapshot` runs on every render of every picker, and matching is free, the object isn't. */
const lists = new Map<string, MediaQueryList>()

function mediaList(query: string): MediaQueryList {
  let list = lists.get(query)
  if (!list) {
    list = window.matchMedia(query)
    lists.set(query, list)
  }
  return list
}

/** True when the media query matches. Always false during SSR and the first client render (no layout flash). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = mediaList(query)
      media.addEventListener("change", callback)
      return () => media.removeEventListener("change", callback)
    },
    () => mediaList(query).matches,
    () => false,
  )
}

/** Tailwind's `lg` breakpoint — where the results page switches to the master/detail layout. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)")
