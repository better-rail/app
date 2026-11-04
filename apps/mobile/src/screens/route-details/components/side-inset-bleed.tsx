import { createContext, useContext } from "react"

const SideInsetBleedContext = createContext({ start: 0, end: 0 })

/**
 * Provided by a list that pads its content away from the side safe-area insets (e.g. the side bar
 * column on iPhone Duo), with the logical start/end insets it padded by.
 */
export const SideInsetBleedProvider = SideInsetBleedContext.Provider

/**
 * Lets a full-width banner's background run under the side insets its list padded away, while its
 * content stays where it was. Pass the banner's own horizontal padding so it's kept on top of the inset.
 */
export function useSideInsetBleed(ownPadding: { start?: number; end?: number } = {}) {
  const { start, end } = useContext(SideInsetBleedContext)
  return {
    marginStart: -start,
    marginEnd: -end,
    paddingStart: start + (ownPadding.start ?? 0),
    paddingEnd: end + (ownPadding.end ?? 0),
  }
}
