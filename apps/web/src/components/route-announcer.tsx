import { useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"

/** Announces the new page title after a client-side navigation, and moves focus to <main> if it was lost. */
export function RouteAnnouncer() {
  const router = useRouter()
  const [title, setTitle] = useState("")

  useEffect(
    () =>
      router.subscribe("onRendered", ({ fromLocation, pathChanged }) => {
        if (!fromLocation || !pathChanged) return
        // A frame later, so head updates and any view transition have landed in the DOM.
        requestAnimationFrame(() => {
          setTitle(document.title)
          const active = document.activeElement
          if (!active || active === document.body) {
            document.getElementById("main")?.focus({ preventScroll: true })
          }
        })
      }),
    [router],
  )

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {title}
    </div>
  )
}
