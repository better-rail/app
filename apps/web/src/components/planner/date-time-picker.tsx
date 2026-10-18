import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { CalendarDays, ChevronDown, Clock, RotateCcw, type LucideIcon } from "lucide-react"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { formatDateField } from "@/lib/format"
import { parseDateInput, parseTimeInput } from "@/lib/parse-input"
import { addDays, dateKey, parseNaive } from "@/lib/time"
import { useIsDesktop } from "@/hooks/use-media-query"
import { Calendar } from "./calendar"
import { PickerPopover, type PickerCloseReason } from "./picker-popover"
import { TimeWheel, snapClock } from "./time-wheel"
import { TimeModeToggle } from "./time-mode-toggle"

export interface DateTimeValue {
  /** `YYYY-MM-DD`, or undefined for "now" */
  date?: string
  /** `HH:mm`, or undefined for "now" */
  time?: string
  /** `time` is when to arrive by rather than when to leave */
  arrive?: boolean
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
  dense = false,
}: {
  value: DateTimeValue
  onChange: (value: DateTimeValue) => void
  /** Israel's date today (`YYYY-MM-DD`) — used as the minimum and as the "now" placeholder */
  today: string
  /** Israel's current time (`HH:mm`) */
  now: string
  className?: string
  /** Slightly shorter desktop controls in the results planner. */
  dense?: boolean
}) {
  const isNow = !value.date && !value.time && !value.arrive
  const fieldClass = cn(
    "flex h-14 w-full items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-start text-[15px] font-medium transition-colors hover:border-line-strong sm:gap-2 sm:px-3",
    dense && "h-11 sm:h-14 lg:h-12",
  )

  return (
    <div
      className={cn(
        // One row at every width: the fields share the space (the date gets more of a phone's, "31/12/2026" being the
        // longest label). The reset control lives inside the time field, shown once the planner is off "now".
        "grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2 sm:grid-cols-2",
        className,
      )}
    >
      <DateField value={value.date} today={today} onChange={(date) => onChange({ ...value, date })} fieldClass={fieldClass} />
      <TimeField
        value={value.time}
        arrive={Boolean(value.arrive)}
        now={now}
        onChange={({ time, arrive }) => onChange({ ...value, time, arrive: arrive || undefined })}
        onReset={() => onChange({ date: undefined, time: undefined, arrive: undefined })}
        canReset={!isNow}
        fieldClass={fieldClass}
      />
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

/** How far ahead a day can be picked: Israel Railways publishes a limited window, and beyond it results come back empty. */
const MAX_DAYS_AHEAD = 90

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
  /** Shown and read out when typed text is dropped, since the field quietly reverts to its last value */
  const [notice, setNotice] = useState("")
  const openPicker = () => {
    setNotice("")
    setOpen(true)
  }
  const { input, button, focusTrigger, onInputFocus } = useTrigger(open, openPicker)

  const typed = text === null ? null : parseDateInput(text, today)
  const selected = typed ?? value ?? today
  const display = formatDateField(selected, locale, today)
  const max = dateKey(addDays(parseNaive(today), MAX_DAYS_AHEAD))
  const invalid = Boolean(text?.trim()) && (!typed || typed > max)

  /** Applies what was typed; text that is unparseable — or past the last day with a timetable — is dropped. */
  const applyTyped = () => {
    setText(null)
    if (invalid) setNotice(t("a11y.invalidDate"))
    if (typed && typed !== value && typed <= max) onChange(typed)
  }

  const close = (reason: PickerCloseReason) => {
    if (reason === "done" || reason === "dismiss") applyTyped()
    setOpen(false)
    setText(null)
    if (reason !== "dismiss") focusTrigger()
  }

  const toggle = () => {
    if (open) return close("done")
    openPicker()
    focusTrigger()
  }

  // Escape belongs to the popover's own listener, which routes "cancel" to `close` here — handling it twice would
  // apply this field's cancel twice over.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Nothing typed and no picker open: Enter belongs to the form.
      if (!open && text === null) return
      event.preventDefault()
      close("done")
    } else if (event.key === "Tab" && open) {
      // Tab moves on to the next field, taking what was typed along; ArrowDown is the way into the picker.
      applyTyped()
      setOpen(false)
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (open) panel.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
      else openPicker()
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
          invalid={invalid}
          popoverId={popoverId}
          className={fieldClass}
          onChange={(raw) => {
            setText(raw)
            // Cleared as typing resumes, so the same message is announced again next time.
            setNotice("")
          }}
          onOpen={openPicker}
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
          onClick={openPicker}
          className={fieldClass}
        />
      )}
      <FieldNotice text={notice} error />
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
          max={max}
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
 * The wheel, the keyboard and the leave/arrive toggle all edit a draft that is applied when the picker closes (unless
 * cancelled), so the results toolbar refetches once per visit rather than on every tick.
 */
function TimeField({
  value,
  arrive,
  now,
  onChange,
  onReset,
  canReset,
  fieldClass,
  className,
}: Omit<FieldProps<string>, "onChange"> & {
  arrive: boolean
  now: string
  onChange: (value: { time: string | undefined; arrive: boolean }) => void
  onReset: () => void
  canReset: boolean
}) {
  const t = useT()
  const isDesktop = useIsDesktop()
  const popoverId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => value ?? now)
  const [draftArrive, setDraftArrive] = useState(arrive)
  /** What's being typed, or null while the field shows the draft */
  const [text, setText] = useState<string | null>(null)
  const touched = useRef(false)
  const anchor = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const invalid = Boolean(text?.trim()) && !parseTimeInput(text ?? "")
  /** Read out when a typed time is dropped (and shown, as an error) or snapped to the wheel's five minutes */
  const [notice, setNotice] = useState({ text: "", error: false })

  const openPicker = () => {
    setDraft(value ?? now)
    setDraftArrive(arrive)
    touched.current = false
    setText(null)
    setNotice({ text: "", error: false })
    setOpen(true)
  }
  const { input, button, focusTrigger, onInputFocus } = useTrigger(open, openPicker)

  // "Arrive by now" searches on the wheel's minute (see `routeSearchParams`), so that's the one shown.
  const display = open ? draft : (value ?? (arrive ? snapClock(now) : now))
  // Only an arrival time is marked: leaving at the time shown is what the field has always meant.
  const caption = (open ? draftArrive : arrive) ? t("plan.arriveBy") : undefined

  // Rolling the wheel rewrites the input while it keeps focus, which parks the caret at the end: the next keystroke
  // would append to "13:25". Re-selecting keeps typing replacing the value, as it does on focus.
  useLayoutEffect(() => {
    const element = input.current
    if (open && text === null && element && document.activeElement === element) element.select()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const type = (raw: string) => {
    setText(raw)
    setNotice({ text: "", error: false })
    const parsed = parseTimeInput(raw)
    if (parsed) {
      setDraft(parsed)
      touched.current = true
    }
  }

  const close = (reason: PickerCloseReason) => {
    setOpen(false)
    setText(null)
    // Snapped on the way out, so the minute that is applied is the one the drum was showing all along: typing "16:17"
    // rolls the wheel to 16:15, and it would be a surprise for the search to run on 16:17.
    const applied = snapClock(draft)
    if (reason !== "cancel" && invalid) setNotice({ text: t("a11y.invalidTime"), error: true })
    else if (reason !== "cancel" && touched.current && applied !== draft)
      setNotice({ text: t("a11y.timeRounded", { time: applied }), error: false })
    const time = touched.current ? applied : value
    if (reason !== "cancel" && (time !== value || draftArrive !== arrive)) onChange({ time, arrive: draftArrive })
    if (reason !== "dismiss") focusTrigger()
  }

  const toggle = () => {
    if (open) return close("done")
    openPicker()
    focusTrigger()
  }

  // As in `DateField`: Escape is the popover's, and arrives here as `close("cancel")`.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (!open && text === null) return
      event.preventDefault()
      close("done")
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

  const resetButton = canReset && (
    <button
      type="button"
      data-reset
      onClick={() => {
        setOpen(false)
        setText(null)
        touched.current = false
        onReset()
        // The button unmounts with the reset; focus would otherwise drop to the page.
        focusTrigger()
      }}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        !isDesktop && "absolute end-1.5 top-1/2 -translate-y-1/2 sm:end-10",
      )}
      aria-label={t("plan.now")}
      title={t("plan.now")}
    >
      <RotateCcw className="size-4" />
    </button>
  )

  return (
    <div ref={anchor} className={cn("relative min-w-0", open && "z-50", className)}>
      {isDesktop ? (
        <FieldInput
          ref={input}
          icon={Clock}
          label={t("plan.time")}
          caption={caption}
          value={text ?? display}
          open={open}
          invalid={invalid}
          popoverId={popoverId}
          className={fieldClass}
          trailingAction={resetButton}
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
          caption={caption}
          display={display}
          open={open}
          onClick={openPicker}
          className={fieldClass}
          displayClassName={canReset ? "me-10" : undefined}
        />
      )}
      {!isDesktop && resetButton}
      <FieldNotice text={notice.text} error={notice.error} />
      <PickerPopover
        id={popoverId}
        open={open}
        onClose={close}
        label={t("plan.time")}
        anchorRef={anchor}
        panelRef={panel}
        panelClassName="p-3"
      >
        <TimeModeToggle
          value={draftArrive ? "arrival" : "departure"}
          onChange={(mode) => setDraftArrive(mode === "arrival")}
          className={cn("mb-3", isDesktop ? "w-[188px]" : "mx-auto w-[220px]")}
        />
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
  caption,
  value,
  open,
  invalid,
  popoverId,
  className,
  trailingAction,
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
  /** A small line over the value, naming what it is ("Arrive by") — it then names the field too */
  caption?: string
  value: string
  open: boolean
  /** Typed text that won't be applied as it stands */
  invalid?: boolean
  popoverId: string
  className: string
  trailingAction?: ReactNode
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
        "cursor-text focus-within:ring-2",
        invalid ? "focus-within:border-danger focus-within:ring-danger" : "focus-within:border-brand focus-within:ring-brand",
        open && "border-brand ring-3 ring-brand/20",
      )}
      onMouseDown={(event) => {
        // The icon and padding act like the input itself (its own presses are handled below).
        const input = ref.current
        if (!input || event.target === input || (event.target as Element).closest("[data-toggle], [data-reset]")) return
        event.preventDefault()
        if (document.activeElement !== input) input.focus()
        else if (!open) reopen(input)
      }}
    >
      <Icon className="size-[18px] shrink-0 text-dim" />
      <span className="flex min-w-0 flex-1 flex-col">
        {caption && <FieldCaption text={caption} />}
        <input
          ref={ref}
          type="text"
          role="combobox"
          aria-label={caption ?? label}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-autocomplete="none"
          aria-invalid={invalid || undefined}
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
          className={cn("min-w-0 bg-transparent tabular outline-none", locale === "he" ? "text-right" : "text-left")}
        />
      </span>
      {trailingAction}
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

/** A field's status message. Errors also show under the field, as the field itself has already reverted (WCAG 3.3.1). */
function FieldNotice({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <span
      role="status"
      className={error && text ? "absolute start-1 top-full mt-1 text-[12.5px] font-medium text-danger-text" : "sr-only"}
    >
      {text}
    </span>
  )
}

/** Read out as the field's name instead, so it's hidden here. */
function FieldCaption({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="truncate text-[11.5px] font-semibold leading-tight text-brand-text">
      {text}
    </span>
  )
}

/** The phone field: a button that opens the picker as a sheet. */
function FieldButton({
  icon: Icon,
  label,
  caption,
  display,
  open,
  className,
  displayClassName,
  ...button
}: ComponentProps<"button"> & {
  icon: LucideIcon
  label: string
  caption?: string
  display: string
  open: boolean
  displayClassName?: string
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        className,
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        open && "border-brand ring-3 ring-brand/20",
      )}
      {...button}
    >
      <Icon className="size-[18px] shrink-0 text-dim" />
      <span className="sr-only">{caption ?? label}</span>
      <span className={cn("flex min-w-0 flex-1 flex-col items-start", displayClassName)}>
        {caption && <FieldCaption text={caption} />}
        <span className="max-w-full truncate tabular">{display}</span>
      </span>
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
