import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

const ROW = 40
export const MINUTE_STEP = 5

const pad = (value: number) => String(value).padStart(2, "0")
const HOURS = Array.from({ length: 24 }, (_, index) => pad(index))
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => pad(index * MINUTE_STEP))

/** Rounds `HH:mm` to the wheel's minute step, carrying into the hour (23:58 → 00:00). */
export function snapClock(clock: string): string {
  const [hours, minutes] = clock.split(":").map(Number)
  const total = (hours * 60 + Math.round(minutes / MINUTE_STEP) * MINUTE_STEP) % (24 * 60)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/**
 * An hours + minutes drum, the way the app's native picker rolls. Each column is a scroll-snap list — native momentum
 * on touch, the mouse wheel or arrow keys on desktop, a click to jump — with one highlight band behind the centre row.
 * `value` must sit on the minute step (see `snapClock`). Always laid out LTR: "12:30" reads that way in Hebrew too.
 *
 * The rows fade out towards the edges with two gradient overlays rather than a `mask-image` on the scroller: WebKit
 * gives up compositor (async) scrolling for a masked scroll container, which is what made the wheel stutter on iPhones.
 */
export function TimeWheel({
  value,
  onChange,
  onSubmit,
  rows = 5,
  autoFocus = false,
  className,
}: {
  /** `HH:mm` */
  value: string
  onChange: (clock: string) => void
  /** Enter on either column — the keyboard's "Done" */
  onSubmit?: () => void
  /** Visible rows per column — odd, so one sits in the middle */
  rows?: 5 | 7
  /** Focus the hours column once mounted */
  autoFocus?: boolean
  className?: string
}) {
  const t = useT()
  const [hour, minute] = value.split(":")

  return (
    <div dir="ltr" className={cn("relative flex justify-center", className)} style={{ height: rows * ROW }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-surface-3"
      />
      <WheelColumn
        label={t("picker.hours")}
        options={HOURS}
        value={hour}
        rows={rows}
        autoFocus={autoFocus}
        onChange={(next) => onChange(`${next}:${minute}`)}
        onSubmit={onSubmit}
      />
      <span aria-hidden="true" className="relative flex w-4 items-center justify-center pb-1 text-[22px] font-bold leading-none">
        :
      </span>
      <WheelColumn
        label={t("picker.minutes")}
        options={MINUTES}
        value={minute}
        rows={rows}
        onChange={(next) => onChange(`${hour}:${next}`)}
        onSubmit={onSubmit}
      />
    </div>
  )
}

function WheelColumn({
  label,
  options,
  value,
  rows,
  autoFocus = false,
  onChange,
  onSubmit,
}: {
  label: string
  options: string[]
  value: string
  rows: number
  autoFocus?: boolean
  onChange: (option: string) => void
  onSubmit?: () => void
}) {
  const id = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(false)
  /** Where a scroll we started ourselves is heading; its scroll events are not the user's and commit nothing. */
  const programmatic = useRef<number | null>(null)
  /** A finger is on the column. Nothing is committed until it lifts — a commit re-renders and re-scrolls the wheel. */
  const pressed = useRef(false)
  const index = Math.max(0, options.indexOf(value))
  const indexRef = useRef(index)
  indexRef.current = index
  /** The row under the band right now — follows the scroll live, ahead of `value` settling. */
  const [centered, setCentered] = useState(index)
  /** Lets the first and last rows reach the centre. */
  const inset = ((rows - 1) / 2) * ROW

  const landing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /**
   * Makes sure a scroll we started gets there. Browsers drop a smooth scroll that interrupts another one (typing "16"
   * asks for 01 and then 16 within a few milliseconds), so once things go quiet we jump the rest of the way.
   */
  const ensureLanding = (delay: number) => {
    clearTimeout(landing.current)
    landing.current = setTimeout(() => {
      const el = scroller.current
      const target = programmatic.current
      if (!el || target === null) return
      if (Math.abs(el.scrollTop - target) >= 1) el.scrollTo({ top: target, behavior: "instant" })
      programmatic.current = null
    }, delay)
  }

  // Land on the value: instantly on mount, smoothly when it changes from a click, a key press, typing, or a settled scroll.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const top = index * ROW
    const atTarget = Math.abs(el.scrollTop - top) < 1
    // Being at `top` isn't enough while a scroll of ours is still heading elsewhere (typing "16": the roll towards 01
    // has only just begun when 16 is asked for) — that one has to be overridden.
    const redirect = programmatic.current !== null && programmatic.current !== top
    if (atTarget && !redirect) {
      programmatic.current = null
      return
    }
    programmatic.current = top
    el.scrollTo({ top, behavior: mounted.current && !atTarget ? "smooth" : "instant" })
    ensureLanding(700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    mounted.current = true
    if (autoFocus) scroller.current?.focus({ preventScroll: true })
    return () => {
      clearTimeout(settle.current)
      clearTimeout(landing.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const select = (next: number) => {
    const clamped = Math.min(options.length - 1, Math.max(0, next))
    if (clamped !== indexRef.current) onChange(options[clamped])
  }

  /** The user taking the wheel over: whatever we were scrolling towards no longer matters. */
  const takeOver = () => {
    programmatic.current = null
  }

  const nearestRow = (el: HTMLElement) => Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)))

  /** Commits the row under the band once the scroll (and its snap) has come to rest with no finger on the column. */
  const settleSoon = () => {
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = scroller.current
      if (el && !pressed.current) select(nearestRow(el))
    }, 150)
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    setCentered(nearestRow(el))
    clearTimeout(settle.current)
    if (programmatic.current !== null) {
      if (Math.abs(el.scrollTop - programmatic.current) < 1) {
        programmatic.current = null
        clearTimeout(landing.current)
      } else {
        ensureLanding(160)
      }
      return
    }
    if (!pressed.current) settleSoon()
  }

  // Touch events rather than pointer events: a pointer is cancelled the moment the browser turns it into a scroll,
  // while touches keep reporting until the finger lifts.
  const onTouchStart = () => {
    pressed.current = true
    takeOver()
  }

  /** Lifted between rows, iOS snaps (more scroll events, so the timer restarts); lifted on one, nothing more comes. */
  const onTouchEnd = () => {
    pressed.current = false
    if (programmatic.current === null) settleSoon()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault()
      onSubmit?.()
      return
    }
    const steps: Record<string, number | undefined> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 6,
      PageUp: -6,
      Home: -options.length,
      End: options.length,
    }
    const step = steps[event.key]
    if (step === undefined) return
    event.preventDefault()
    select(index + step)
  }

  return (
    <div className="relative rounded-xl has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand/30">
      <div
        ref={scroller}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${id}-${index}`}
        onScroll={onScroll}
        onWheel={takeOver}
        onPointerDown={takeOver}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onKeyDown={onKeyDown}
        className="scrollbar-none w-[76px] touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none"
        style={{ height: rows * ROW }}
      >
        <div style={{ paddingBlock: inset }}>
          {options.map((option, optionIndex) => (
            <div
              key={option}
              id={`${id}-${optionIndex}`}
              role="option"
              aria-selected={optionIndex === index}
              onClick={() => select(optionIndex)}
              className={cn(
                "flex h-10 snap-center items-center justify-center text-[21px] tabular transition-colors duration-150",
                optionIndex === centered ? "font-semibold text-text" : "text-muted",
              )}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30%] bg-linear-to-b from-surface to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-linear-to-t from-surface to-transparent"
      />
    </div>
  )
}
