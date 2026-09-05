import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { useIsDesktop } from "@/hooks/use-media-query"

/**
 * Why a picker closed: `select` and `done` are deliberate (focus returns to the trigger), `dismiss` is a tap or a Tab
 * elsewhere (keep what was set, leave focus where the user put it), `cancel` is Escape or the sheet's close button.
 */
export type PickerCloseReason = "select" | "done" | "dismiss" | "cancel"

export interface PickerPopoverProps {
  open: boolean
  onClose: (reason: PickerCloseReason) => void
  /** The dialog's name — also the bottom sheet's title */
  label: string
  /** For the trigger's `aria-controls` */
  id?: string
  /** The field the popover anchors to; focus and taps inside it don't count as "outside" */
  anchorRef: RefObject<HTMLElement | null>
  /** Receives the dialog element, so the field can tell focus moving into the picker from focus leaving */
  panelRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
  /** Extra classes for the desktop panel (padding, width) */
  panelClassName?: string
  /** The phone sheet: `auto` hugs its content (a calendar, a wheel); `tall` runs from near the top for a scrolling list */
  size?: "auto" | "tall"
}

/**
 * The shell shared by the date and time pickers. On desktop it's a panel anchored under its trigger that moves to the
 * other side when the viewport is tight; on phones it's a bottom sheet over the page (portalled to `body`, so an
 * animated ancestor can't trap it). Escape, an outside tap, tabbing away, or the sheet's close button dismiss it.
 */
export function PickerPopover(props: PickerPopoverProps) {
  const isDesktop = useIsDesktop()
  if (!props.open) return null
  return isDesktop ? <AnchoredPanel {...props} /> : <BottomSheet {...props} />
}

function useEscape(onClose: PickerPopoverProps["onClose"]) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      onClose("cancel")
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])
}

interface Placement {
  align: "start" | "end"
  side: "bottom" | "top"
}

function AnchoredPanel({ id, anchorRef, panelRef, label, onClose, children, panelClassName }: PickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement>({ align: "start", side: "bottom" })

  const setRefs = (element: HTMLDivElement | null) => {
    ref.current = element
    if (panelRef) panelRef.current = element
  }

  useEscape(onClose)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose("dismiss")
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [anchorRef, onClose])

  // Measured once on open, before paint: pick the side of the trigger that has room for the panel.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const panel = ref.current
    if (!anchor || !panel) return
    const rect = anchor.getBoundingClientRect()
    const rtl = getComputedStyle(panel).direction === "rtl"
    const margin = 12
    const gap = 8
    const fitsStart = rtl ? rect.right - panel.offsetWidth >= margin : rect.left + panel.offsetWidth <= window.innerWidth - margin
    const fitsBelow = rect.bottom + gap + panel.offsetHeight <= window.innerHeight - margin
    const fitsAbove = rect.top - gap - panel.offsetHeight >= margin
    setPlacement({ align: fitsStart ? "start" : "end", side: fitsBelow || !fitsAbove ? "bottom" : "top" })
  }, [anchorRef])

  /** Tabbing out of the panel closes it. A click on nothing focusable is left to the pointerdown listener. */
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (!next || ref.current?.contains(next) || anchorRef.current?.contains(next)) return
    onClose("dismiss")
  }

  return (
    <div
      ref={setRefs}
      id={id}
      role="dialog"
      aria-label={label}
      onBlur={onBlur}
      className={cn(
        "animate-pop absolute z-50 rounded-2xl border border-line bg-surface shadow-pop",
        placement.align === "start" ? "start-0" : "end-0",
        placement.side === "bottom" ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom",
        panelClassName,
      )}
    >
      {children}
    </div>
  )
}

function BottomSheet({ id, panelRef, label, onClose, children, size = "auto" }: PickerPopoverProps) {
  const t = useT()

  useEscape(onClose)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-overlay" onClick={() => onClose("dismiss")} />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "animate-sheet-up absolute inset-x-0 bottom-0 flex flex-col rounded-t-[24px] bg-surface pb-[max(env(safe-area-inset-bottom),16px)] shadow-pop",
          size === "tall" && "top-[max(env(safe-area-inset-top),2.75rem)]",
        )}
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
        <div className="flex shrink-0 items-center justify-between pb-1 pe-3 ps-5 pt-2">
          <span className="text-[17px] font-bold">{label}</span>
          <button type="button" onClick={() => onClose("cancel")} className="icon-btn size-9" aria-label={t("nav.close")}>
            <X className="size-5" />
          </button>
        </div>
        <div className={cn("flex min-h-0 flex-1 flex-col", size === "auto" && "px-4 pt-1")}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
