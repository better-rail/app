import { useId, useRef, useState, type ComponentProps, type FocusEvent, type KeyboardEvent, type RefObject } from "react"
import { CalendarDays, ChevronDown, Clock, RotateCcw, type LucideIcon } from "lucide-react"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { formatDateField } from "@/lib/format"
import { parseDateInput, parseTimeInput } from "@/lib/parse-input"
import { useIsDesktop } from "@/hooks/use-media-query"
import { Calendar } from "./calendar"
import { PickerPopover, type PickerCloseReason } from "./picker-popover"
import { TimeWheel, snapClock } from "./time-wheel"

export interface DateTimeValue {
  /** `YYYY-MM-DD`, or undefined for "now" */
  date?: string
  /** `HH:mm`, or undefined for "now" */
  time?: string
}

/**
 * The planner's "leave at" fields. On desktop each is a text input with a picker attached: it opens on focus, typing
 * ("7/9", "1630") previews in the picker and applies on Enter or when focus leaves, the picker itself applies on
 * selection. On phones each is a button that opens the picker as a bottom sheet.
 */
export function DateTimePicker({
  value,
  onChange,
  today,
  now,
  className,
  compact = false,
}: {
  value: DateTimeValue
  onChange: (value: DateTimeValue) => void
  /** Israel's date today (`YYYY-MM-DD`) — used as the minimum and as the "now" placeholder */
  today: string
  /** Israel's current time (`HH:mm`) */
  now: string
  className?: string
  compact?: boolean
}) {
  const t = useT()
  const isNow = !value.date && !value.time
  const fieldClass = cn(
    "flex w-full items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-start text-[15px] font-medium transition-colors hover:border-line-strong sm:gap-2 sm:px-3",
    compact ? "h-11" : "h-14",
  )

  return (
    <div
      className={cn(
        // One row at every width: the fields share the space (the date gets more of a phone's, "31/12/2026" being the
        // longest label) and "Now" shrinks to its icon there.
        "grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
        compact && "lg:grid-cols-[168px_128px_auto]",
        className,
      )}
    >
      <DateField value={value.date} today={today} onChange={(date) => onChange({ ...value, date })} fieldClass={fieldClass} />
      <TimeField value={value.time} now={now} onChange={(time) => onChange({ ...value, time })} fieldClass={fieldClass} />
      <button
        type="button"
        onClick={() => onChange({ date: undefined, time: undefined })}
        disabled={isNow}
        className={cn("btn-secondary gap-1.5 px-0 sm:px-3.5", compact ? "h-11 min-w-11" : "h-14 min-w-14", isNow && "!opacity-60")}
        aria-label={t("plan.now")}
        title={t("plan.now")}
      >
        <RotateCcw className="size-4" />
        <span className="hidden sm:inline">{t("plan.now")}</span>
      </button>
    </div>
  )
}

interface FieldProps<T> {
  value: T | undefined
  onChange: (value: T) => void
  fieldClass: string
  className?: string
}

/**
 * The field's focusable element — the desktop input or the phone button — and a way to put focus back on it after the
 * picker closes without the input's focus handler popping the picker open again.
 */
function useTrigger(open: boolean, openPicker: () => void) {
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const skipOpen = useRef(false)

  const focusTrigger = () => {
    const element = input.current ?? button.current
    if (!element || document.activeElement === element) return
    // Focus events dispatch synchronously inside `focus()`, so the flag only covers this call.
    skipOpen.current = true
    element.focus({ preventScroll: true })
    skipOpen.current = false
  }

  const onInputFocus = () => {
    if (!skipOpen.current && !open) openPicker()
  }

  return { input, button, focusTrigger, onInputFocus }
}

const contains = (ref: RefObject<HTMLElement | null>, node: EventTarget | null) =>
  node instanceof Node && Boolean(ref.current?.contains(node))

/** Picking a day applies and closes at once, like a native calendar. */
function DateField({ value, today, onChange, fieldClass, className }: FieldProps<string> & { today: string }) {
  const t = useT()
  const locale = useLocale()
  const isDesktop = useIsDesktop()
  const popoverId = useId()
  const [open, setOpen] = useState(false)
  /** What's being typed, or null while the field shows its label */
  const [text, setText] = useState<string | null>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const { input, button, focusTrigger, onInputFocus } = useTrigger(open, () => setOpen(true))

  const typed = text === null ? null : parseDateInput(text, today)
  const selected = typed ?? value ?? today
  const display = formatDateField(selected, locale, today)

  /** Applies what was typed; unparseable text is dropped. */
  const applyTyped = () => {
    setText(null)
    if (typed && typed !== value) onChange(typed)
  }

  const close = (reason: PickerCloseReason) => {
    if (reason === "done" || reason === "dismiss") applyTyped()
    setOpen(false)
    setText(null)
    if (reason !== "dismiss") focusTrigger()
  }

  const toggle = () => {
    if (open) return close("done")
    setOpen(true)
    focusTrigger()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Nothing typed and no picker open: Enter belongs to the form.
      if (!open && text === null) return
      event.preventDefault()
      close("done")
    } else if (event.key === "Escape") {
      event.stopPropagation()
      setText(null)
      if (open) close("cancel")
    } else if (event.key === "Tab" && open) {
      // Tab moves on to the next field, taking what was typed along; ArrowDown is the way into the picker.
      applyTyped()
      setOpen(false)
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (open) panel.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
      else setOpen(true)
    }
  }

  /** Focus moving into the picker keeps the typed preview; focus leaving applies it and closes. */
  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget
    if (contains(anchor, next) || contains(panel, next)) return
    applyTyped()
    if (next) setOpen(false)
  }

  return (
    <div ref={anchor} className={cn("relative min-w-0", open && "z-50", className)}>
      {isDesktop ? (
        <FieldInput
          ref={input}
          icon={CalendarDays}
          label={t("plan.date")}
          value={text ?? display}
          open={open}
          popoverId={popoverId}
          className={fieldClass}
          onChange={setText}
          onOpen={() => setOpen(true)}
          onToggle={toggle}
          onFocus={onInputFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      ) : (
        <FieldButton
          ref={button}
          icon={CalendarDays}
          label={t("plan.date")}
          display={display}
          open={open}
          onClick={() => setOpen(true)}
          className={fieldClass}
        />
      )}
      <PickerPopover
        id={popoverId}
        open={open}
        onClose={close}
        label={t("plan.date")}
        anchorRef={anchor}
        panelRef={panel}
        panelClassName="p-3"
      >
        <Calendar
          value={selected}
          min={today}
          today={today}
          autoFocus={!isDesktop}
          className={isDesktop ? "w-[294px]" : "mx-auto w-full max-w-[360px] pb-2"}
          onSelect={(date) => {
            setText(null)
            onChange(date)
            close("select")
          }}
        />
      </PickerPopover>
    </div>
  )
}

/**
 * The wheel and the keyboard both edit a draft that is applied when the picker closes (unless cancelled), so the
 * results toolbar refetches once per visit rather than on every tick.
 */
function TimeField({ value, now, onChange, fieldClass, className }: FieldProps<string> & { now: string }) {
  const t = useT()
  const isDesktop = useIsDesktop()
  const popoverId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => value ?? now)
  /** What's being typed, or null while the field shows the draft */
  const [text, setText] = useState<string | null>(null)
  const touched = useRef(false)
  const anchor = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    setDraft(value ?? now)
    touched.current = false
    setText(null)
    setOpen(true)
  }
  const { input, button, focusTrigger, onInputFocus } = useTrigger(open, openPicker)

  const display = open ? draft : (value ?? now)

  const type = (raw: string) => {
    setText(raw)
    const parsed = parseTimeInput(raw)
    if (parsed) {
      setDraft(parsed)
      touched.current = true
    }
  }

  const close = (reason: PickerCloseReason) => {
    setOpen(false)
    setText(null)
    if (reason !== "cancel" && touched.current && draft !== value) onChange(draft)
    if (reason !== "dismiss") focusTrigger()
  }

  const toggle = () => {
    if (open) return close("done")
    openPicker()
    focusTrigger()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (!open && text === null) return
      event.preventDefault()
      close("done")
    } else if (event.key === "Escape") {
      event.stopPropagation()
      close("cancel")
    } else if (event.key === "Tab" && open) {
      close("dismiss")
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (open) panel.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
      else openPicker()
    }
  }

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget
    if (contains(anchor, next) || contains(panel, next)) return
    if (next) close("dismiss")
    else setText(null)
  }

  return (
    <div ref={anchor} className={cn("relative min-w-0", open && "z-50", className)}>
      {isDesktop ? (
        <FieldInput
          ref={input}
          icon={Clock}
          label={t("plan.time")}
          value={text ?? display}
          open={open}
          popoverId={popoverId}
          className={fieldClass}
          onChange={type}
          onOpen={() => !open && openPicker()}
          onToggle={toggle}
          onFocus={onInputFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      ) : (
        <FieldButton
          ref={button}
          icon={Clock}
          label={t("plan.time")}
          display={display}
          open={open}
          onClick={openPicker}
          className={fieldClass}
        />
      )}
      <PickerPopover
        id={popoverId}
        open={open}
        onClose={close}
        label={t("plan.time")}
        anchorRef={anchor}
        panelRef={panel}
        panelClassName="p-3"
      >
        <TimeWheel
          value={snapClock(draft)}
          rows={isDesktop ? 5 : 7}
          autoFocus={!isDesktop}
          className={isDesktop ? "w-[188px]" : "mx-auto w-[220px]"}
          onChange={(clock) => {
            setDraft(clock)
            touched.current = true
            setText(null)
          }}
          onSubmit={() => close("done")}
        />
        <button
          type="button"
          onClick={() => close("done")}
          className={cn("btn-primary mt-3 w-full", isDesktop ? "h-10" : "h-12 text-[16px]")}
        >
          {t("picker.done")}
        </button>
      </PickerPopover>
    </div>
  )
}

/**
 * The desktop field: a combobox-style text input with the picker as its popup. Clicking anywhere in the field focuses
 * the input and selects its text, so typing replaces "Today" or "16:17" outright.
 */
function FieldInput({
  ref,
  icon: Icon,
  label,
  value,
  open,
  popoverId,
  className,
  onChange,
  onOpen,
  onToggle,
  onFocus,
  onBlur,
  onKeyDown,
}: {
  ref: RefObject<HTMLInputElement | null>
  icon: LucideIcon
  label: string
  value: string
  open: boolean
  popoverId: string
  className: string
  onChange: (text: string) => void
  /** A press anywhere in the field — also reopens the picker when the input already had focus */
  onOpen: () => void
  onToggle: () => void
} & Pick<ComponentProps<"input">, "onFocus" | "onBlur" | "onKeyDown">) {
  const locale = useLocale()
  /** Chrome undoes a `select()` made on focus when the mouse button comes up; swallowing that mouseup keeps it. */
  const keepSelection = useRef(false)

  /** A press on a field that already has focus: reopen the picker and select the text, as on first focus. */
  const reopen = (input: HTMLInputElement) => {
    input.select()
    keepSelection.current = true
    onOpen()
  }

  return (
    <div
      className={cn(
        className,
        "cursor-text focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20",
        open && "border-brand ring-3 ring-brand/20",
      )}
      onMouseDown={(event) => {
        // The icon and padding act like the input itself (its own presses are handled below).
        const input = ref.current
        if (!input || event.target === input || (event.target as Element).closest("[data-toggle]")) return
        event.preventDefault()
        if (document.activeElement !== input) input.focus()
        else if (!open) reopen(input)
      }}
    >
      <Icon className="size-[18px] shrink-0 text-dim" />
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-autocomplete="none"
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onMouseDown={(event) => {
          const input = event.currentTarget
          if (document.activeElement !== input) {
            keepSelection.current = true // the focus handler is about to select
          } else if (!open) {
            event.preventDefault() // no caret: the text is about to be selected instead
            reopen(input)
          }
        }}
        onMouseUp={(event) => {
          if (!keepSelection.current) return
          keepSelection.current = false
          event.preventDefault()
        }}
        onFocus={(event) => {
          event.currentTarget.select()
          onFocus?.(event)
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn("min-w-0 flex-1 bg-transparent tabular outline-none", locale === "he" ? "text-right" : "text-left")}
      />
      <span
        data-toggle
        aria-hidden="true"
        onMouseDown={(event) => {
          event.preventDefault()
          onToggle()
        }}
        className="-me-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-dim transition-colors hover:bg-surface-3"
      >
        <ChevronDown className={cn("size-4 transition-transform duration-200 ease-out-expo", open && "rotate-180")} />
      </span>
    </div>
  )
}

/** The phone field: a button that opens the picker as a sheet. */
function FieldButton({
  icon: Icon,
  label,
  display,
  open,
  className,
  ...button
}: ComponentProps<"button"> & { icon: LucideIcon; label: string; display: string; open: boolean }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        className,
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20",
        open && "border-brand ring-3 ring-brand/20",
      )}
      {...button}
    >
      <Icon className="size-[18px] shrink-0 text-dim" />
      <span className="sr-only">{label}</span>
      <span className="min-w-0 flex-1 truncate tabular">{display}</span>
      {/* No chevron on phones: the icon and the value say enough, and a 360px screen has no room for it. */}
      <ChevronDown
        className={cn(
          "hidden size-4 shrink-0 text-dim transition-transform duration-200 ease-out-expo sm:block",
          open && "rotate-180",
        )}
      />
    </button>
  )
}
