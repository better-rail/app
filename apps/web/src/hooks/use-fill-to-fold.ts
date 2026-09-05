import { useEffect, type RefObject } from "react"

/**
 * Sizes a side pane inside a sticky wrapper so its bottom edge sits at the fold while it is pinned under the
 * toolbar, or lower down while the hero is still in view above it. The pane scrolls on its own, so everything in
 * it stays reachable without any of it hiding below the viewport. It is never made taller than its pinned size:
 * at the end of the page the wrapper is pushed up past its pinned spot by the bottom of its container, and sizing
 * from that would balloon the pane and shove the card upward in a jump. From there it just rides off with the
 * container, as sticky content does.
 *
 * Desktop only (`lg` and up); below that the inline height is cleared and the pane is ordinary content.
 */
export function useFillToFold(
  ref: RefObject<HTMLElement | null>,
  { gap = 8, breakpoint = "(min-width: 1024px)" }: { gap?: number; breakpoint?: string } = {},
) {
  useEffect(() => {
    const pane = ref.current
    if (!pane) return
    const media = window.matchMedia(breakpoint)
    let frame = 0

    const fit = () => {
      frame = 0
      const wrapper = pane.parentElement
      if (!media.matches || !wrapper) {
        pane.style.height = ""
        return
      }
      const paneTop = pane.getBoundingClientRect().top
      // Where the pane sits once the wrapper is pinned: the wrapper's sticky `top`, plus the pane's own offset in it.
      const pinnedTop = (parseFloat(getComputedStyle(wrapper).top) || 0) + (paneTop - wrapper.getBoundingClientRect().top)
      const top = Math.max(paneTop, pinnedTop)
      pane.style.height = `${Math.max(0, Math.round(window.innerHeight - gap - top))}px`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit)
    }

    fit()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    media.addEventListener("change", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      media.removeEventListener("change", schedule)
      pane.style.height = ""
    }
  }, [ref, gap, breakpoint])
}
