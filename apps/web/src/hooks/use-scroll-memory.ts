import { useEffect, useRef, useState } from "react"
import { useRouterState } from "@tanstack/react-router"

const STORAGE_KEY = "better-rail:scroll"
/** How long after the last scroll the position is written. */
const SETTLE_MS = 200

interface Memory {
  /** The history entry the position belongs to */
  key: string
  scrollY: number
}

function read(): Memory | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Memory) : undefined
  } catch {
    return undefined
  }
}

function write(memory: Memory) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // Private mode or a full store: the page arrives fresh next time, as it does today.
  }
}

/**
 * The position the reader left a page at, across a reload they did not ask for.
 *
 * The router restores the position it saves on `pagehide`. A browser that discards a background tab (Chrome's memory
 * saver, iOS Safari under memory pressure) does so without firing it, and loads the page afresh when the reader comes
 * back — with the same history entry, so its key survives. The position is kept here against that key, written as
 * the reader scrolls and when the tab goes to the background (the last event a tab reliably gets before it is
 * discarded), and handed back when the page mounts on the same entry.
 *
 * Returns the position to put the page back at, or undefined when it is arriving fresh. Read once, on mount: the
 * page that restores it decides when its content is in place.
 */
export function useScrollMemory(): number | undefined {
  // The same key the router's own restoration uses, so a reload of an entry finds the position saved for it.
  const key = useRouterState({ select: (s) => s.location.state.__TSR_key ?? s.location.href })
  const [remembered] = useState(() => {
    if (typeof sessionStorage === "undefined") return undefined
    const memory = read()
    return memory?.key === key ? memory.scrollY : undefined
  })

  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const save = () => {
      timer = undefined
      write({ key: keyRef.current, scrollY: window.scrollY })
    }
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(save, SETTLE_MS)
    }
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return
      clearTimeout(timer)
      save()
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("visibilitychange", onHidden)
    window.addEventListener("pagehide", save)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onHidden)
      window.removeEventListener("pagehide", save)
    }
  }, [])

  return remembered
}
