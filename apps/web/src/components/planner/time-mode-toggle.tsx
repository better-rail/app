import { useRef, type KeyboardEvent } from "react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

export type TimeMode = "departure" | "arrival"

const MODES: TimeMode[] = ["departure", "arrival"]

/** "Leave at" / "Arrive by" as a two-segment radio group, at the top of the time picker. */
export function TimeModeToggle({
  value,
  onChange,
  className,
}: {
  value: TimeMode
  onChange: (mode: TimeMode) => void
  className?: string
}) {
  const t = useT()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    // Two options: every arrow lands on the other one.
    const next = value === "departure" ? "arrival" : "departure"
    onChange(next)
    buttons.current[MODES.indexOf(next)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("plan.timeMode")}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-grid grid-cols-[1fr_1fr] rounded-[10px] bg-[rgb(118_118_128/0.12)] p-0.5 dark:bg-[rgb(118_118_128/0.24)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0.5 start-0.5 w-[calc(50%-2px)] rounded-lg bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-transform duration-300 ease-out-expo dark:bg-line-strong",
          value === "arrival" && "translate-x-full rtl:-translate-x-full",
        )}
      />
      {MODES.map((mode, index) => {
        const checked = value === mode
        return (
          <button
            key={mode}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // No `tabindex="0"` on the checked one: the time field's ArrowDown looks for that to step into the wheel.
            tabIndex={checked ? undefined : -1}
            onClick={() => onChange(mode)}
            className={cn(
              "relative h-7 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              checked ? "text-text" : "text-dim hover:text-text-2",
            )}
          >
            {t(mode === "departure" ? "plan.leaveAt" : "plan.arriveAt")}
          </button>
        )
      })}
    </div>
  )
}
