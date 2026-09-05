import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { Search, X, ChevronDown, TrainFront, Clock } from "lucide-react"
import { stationName, getStationById, type Station } from "@/data/stations"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { useIsDesktop } from "@/hooks/use-media-query"
import { useRecentRoutes } from "@/hooks/use-stored"
import { useStationSearch } from "./use-station-search"
import { PickerPopover, type PickerCloseReason } from "./picker-popover"
import { StationImage } from "../stations/station-image"
import { StationPhotoCard } from "../stations/station-card"

export interface StationPickerProps {
  label: string
  value: Station | undefined
  onChange: (station: Station) => void
  /** The station selected in the other field — shown dimmed so it can't be picked twice */
  exclude?: Station
  /** `card` mimics the app's photo cards; `field` is the compact input of the results toolbar */
  variant?: "card" | "field"
  autoFocus?: boolean
  className?: string
  kind: "origin" | "destination"
}

/**
 * A station field with a searchable list attached. The list lives in the same shell as the date and time pickers: a
 * panel under the field on desktop, a sheet running most of the screen on phones. Recent picks come first.
 */
export function StationPicker({ label, value, onChange, exclude, variant = "card", className, kind }: StationPickerProps) {
  const t = useT()
  const locale = useLocale()
  const isDesktop = useIsDesktop()
  const popoverId = useId()
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const { results } = useStationSearch(query)
  const recent = useRecentRoutes()
  const anchor = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  /** The highlight was just moved with the arrow keys, so the list should scroll to keep it in view. */
  const keyboardMove = useRef(false)

  const recentStations = (() => {
    const ids = recent.map((route) => (kind === "origin" ? route.originId : route.destinationId))
    const unique = Array.from(new Set(ids))
      .map((id) => getStationById(id))
      .filter((station): station is Station => Boolean(station))
    return unique.slice(0, 4)
  })()

  const showRecent = query.trim() === "" && recentStations.length > 0

  // A new query starts the list over: first match highlighted, scrolled back to the top (as the app does).
  useEffect(() => {
    setActiveIndex(0)
    list.current?.scrollTo({ top: 0 })
  }, [query])

  // Only after a key press: a hovered row is on screen already, and scrolling it "into view" could move the page.
  useEffect(() => {
    if (!keyboardMove.current) return
    keyboardMove.current = false
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  /**
   * Mounts the picker within the tap itself and puts the caret in the search field there and then: iOS only raises
   * its keyboard for a focus made inside a user gesture, so the field can't wait for an effect to focus it.
   */
  const openPicker = () => {
    flushSync(() => {
      setQuery("")
      setOpen(true)
    })
    input.current?.focus({ preventScroll: true })
  }

  /**
   * Focus goes back to the field for keyboard users only (Enter, or Escape on desktop): moved there after a click or
   * a tap, the browser would paint a focus ring on the field.
   */
  const close = (reason: PickerCloseReason, viaKeyboard = reason === "cancel" && isDesktop) => {
    setOpen(false)
    if (viaKeyboard) trigger.current?.focus({ preventScroll: true })
  }

  const select = (station: Station, viaKeyboard = false) => {
    if (station.id === exclude?.id) return
    onChange(station)
    close("select", viaKeyboard)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      keyboardMove.current = true
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      keyboardMove.current = true
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const station = results[activeIndex]
      if (station) select(station, true)
    }
  }

  const name = value ? stationName(value, locale) : undefined

  const triggerButton =
    variant === "card" ? (
      <button
        ref={trigger}
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className="group block w-full text-start transition-transform duration-200 ease-out-expo active:scale-[0.98]"
      >
        <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        {value ? (
          <StationPhotoCard station={value} name={name ?? ""} className="shadow-card group-hover:shadow-card-hover" />
        ) : (
          <span className="flex h-44 flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-surface-2 text-muted transition-colors group-hover:border-brand/50 group-hover:text-brand-text sm:h-48 lg:h-56">
            <TrainFront className="size-8 opacity-60" />
            <span className="font-medium">{t("plan.selectStation")}</span>
          </span>
        )}
      </button>
    ) : (
      <button
        ref={trigger}
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-start shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] transition-colors hover:border-line-strong focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20",
          open && "border-brand ring-3 ring-brand/20",
        )}
      >
        <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-surface-3">
          {value && <StationImage station={value} sizes="72px" className="absolute inset-0" />}
          {!value && <TrainFront className="absolute inset-0 m-auto size-5 text-dim" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</span>
          <span className={cn("truncate text-[16px] font-semibold", !value && "text-dim")}>
            {name ?? t("plan.selectStation")}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-dim transition-transform duration-200 ease-out-expo", open && "rotate-180")}
        />
      </button>
    )

  return (
    <div ref={anchor} className={cn("relative min-w-0", open && "z-50", className)}>
      {triggerButton}

      <PickerPopover
        id={popoverId}
        open={open}
        onClose={close}
        label={label}
        anchorRef={anchor}
        size="tall"
        animation="fade-up"
        // `--panel-room` is what the shell measured between the field and the fold, so the list never runs past it.
        panelClassName="flex w-full min-w-[340px] max-h-(--panel-room) flex-col overflow-hidden"
      >
        <div className={cn("shrink-0", isDesktop ? "p-2 pb-1.5" : "px-4 pb-2 pt-1")}>
          <div className="flex h-11 items-center gap-2.5 rounded-xl bg-surface-3 px-3 transition-shadow focus-within:ring-3 focus-within:ring-brand/25">
            <Search className="size-[18px] shrink-0 text-dim" aria-hidden="true" />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-controls={listboxId}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-activedescendant={results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("plan.searchPlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  input.current?.focus()
                }}
                className="-me-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:text-text"
                aria-label={t("plan.clearSearch")}
              >
                <span className="flex size-[18px] items-center justify-center rounded-full bg-current">
                  <X className="size-3 text-surface-3" strokeWidth={3} />
                </span>
              </button>
            )}
          </div>
        </div>

        <ul
          ref={list}
          id={listboxId}
          role="listbox"
          aria-label={label}
          // Dragging the list puts the keyboard away, so the whole sheet is there to browse.
          onTouchMove={() => document.activeElement === input.current && input.current?.blur()}
          className={cn(
            "scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain",
            isDesktop ? "max-h-[420px] p-1.5" : "px-2.5 pb-2",
          )}
        >
          {showRecent && <ListHeading>{t("plan.recentSearches")}</ListHeading>}
          {showRecent &&
            recentStations.map((station) => (
              <StationOption
                key={`recent-${station.id}`}
                station={station}
                name={stationName(station, locale)}
                active={false}
                disabled={station.id === exclude?.id}
                onSelect={select}
                id={`${listboxId}-recent-${station.id}`}
                icon={<Clock className="size-4 text-dim" />}
              />
            ))}
          {showRecent && <ListHeading>{t("plan.allStations")}</ListHeading>}
          {results.map((station, index) => (
            <StationOption
              key={station.id}
              station={station}
              name={stationName(station, locale)}
              // The keyboard highlight is a desktop affordance; on a phone it would read as a selection.
              active={isDesktop && index === activeIndex}
              selected={station.id === value?.id}
              disabled={station.id === exclude?.id}
              onSelect={select}
              onHover={() => setActiveIndex(index)}
              id={`${listboxId}-${station.id}`}
            />
          ))}
          {results.length === 0 && <li className="px-3 py-8 text-center text-muted">{t("plan.noResults")}</li>}
        </ul>
      </PickerPopover>
    </div>
  )
}

function ListHeading({ children }: { children: ReactNode }) {
  return (
    <li role="presentation" className="px-2.5 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide text-dim first:pt-2">
      {children}
    </li>
  )
}

function StationOption({
  station,
  name,
  active,
  selected,
  disabled,
  onSelect,
  onHover,
  id,
  icon,
}: {
  station: Station
  name: string
  active: boolean
  selected?: boolean
  disabled?: boolean
  onSelect: (station: Station) => void
  onHover?: () => void
  id: string
  icon?: ReactNode
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected ?? false}
      aria-disabled={disabled}
      data-active={active}
      onMouseMove={onHover}
      onClick={() => !disabled && onSelect(station)}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors lg:py-2",
        active && "bg-brand-soft",
        !active && "hover:bg-surface-3 active:bg-surface-3",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface-3">
        <StationImage station={station} sizes="88px" className="absolute inset-0" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{name}</span>
      {icon}
      {selected && <span className="size-2 rounded-full bg-brand" aria-hidden="true" />}
    </li>
  )
}
