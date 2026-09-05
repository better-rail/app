import { useSyncExternalStore } from "react"

/** True when the media query matches. Always false during SSR and the first client render (no layout flash). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", callback)
      return () => media.removeEventListener("change", callback)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's `lg` breakpoint — where the results page switches to the master/detail layout. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)")
