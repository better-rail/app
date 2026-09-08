import { memo, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
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
  className?: string
  kind: "origin" | "destination"
}

/** The clock beside a recent pick — a constant, so the memoised rows don't see a new element every render. */
const RECENT_ICON = <Clock className="size-4 text-dim" />

/** The next selectable row in `direction`, or `from` itself when the list runs out — excluded rows are stepped over. */
function nextEnabled(options: Station[], excludeId: string | undefined, from: number, direction: 1 | -1): number {
  for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
    if (options[index].id !== excludeId) return index
  }
  return from
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
  /** The highlighted row in `options`, or -1 for "nothing highlighted yet" — see the Enter branch below. */
  const [activeIndex, setActiveIndex] = useState(-1)
  const { results } = useStationSearch(query, open)
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
  /** Every row of the listbox in the order it is drawn, so the arrow keys and `aria-activedescendant` see the recents. */
  const options = showRecent ? [...recentStations, ...results] : results
  /** Where the "all stations" section starts in `options` — the same station can appear in both, with its own index. */
  const recentCount = showRecent ? recentStations.length : 0
  const optionId = (index: number) => `${listboxId}-${index}`

  /**
   * A new query starts the list over: first selectable match highlighted, scrolled back to the top (as the app does).
   * An empty query highlights nothing instead, so the phone keyboard's "Done" can't commit a station the user never
   * saw — and so the highlight never sits on a row that is scrolled out of sight under the recents.
   */
  useEffect(() => {
    setActiveIndex(query.trim() === "" ? -1 : nextEnabled(results, exclude?.id, -1, 1))
    list.current?.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setActiveIndex(-1)
      setOpen(true)
    })
    input.current?.focus({ preventScroll: true })
  }

  /**
   * Focus goes back to the field for every deliberate close (a pick, Escape, the sheet's X), as the date and time
   * fields do, so the next Tab carries on from the planner rather than from the top of the document. Only a dismiss —
   * a tap outside or a Tab away — leaves focus where the user put it. A programmatic focus after a pointer press
   * doesn't match `:focus-visible`, so no ring is painted on the field.
   */
  const close = useCallback((reason: PickerCloseReason) => {
    setOpen(false)
    if (reason !== "dismiss") trigger.current?.focus({ preventScroll: true })
  }, [])

  const excludeId = exclude?.id

  const select = useCallback(
    (station: Station) => {
      if (station.id === excludeId) return
      onChange(station)
      close("select")
    },
    [excludeId, onChange, close],
  )

  /** Stable, so moving the pointer down the list re-renders the picker but not all seventy rows. */
  const hover = useCallback((index: number) => setActiveIndex(index), [])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      keyboardMove.current = true
      setActiveIndex((index) => nextEnabled(options, excludeId, index, 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      keyboardMove.current = true
      setActiveIndex((index) => nextEnabled(options, excludeId, index, -1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      // Nothing highlighted: the phone keyboard's "Done" only means "put me away", and no station was ever pointed at.
      // (The desktop panel sits inside the hero's form, so the press has to be swallowed rather than left to submit it.)
      if (activeIndex < 0) {
        if (!isDesktop) input.current?.blur()
        return
      }
      const station = options[activeIndex]
      if (station) select(station)
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
          "flex h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-start shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] dark:shadow-none transition-colors hover:border-line-strong focus-visible:border-brand focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20",
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
        {/* Built only while open: the popover renders nothing when closed, but the station list is a few hundred
            elements, and the results toolbar has two of these re-rendering with every trip picked. */}
        {open && (
          <>
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
                  aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
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
                    // The mark stays 18px; the button around it is a 44px touch target inside the 44px search row.
                    className="-me-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:text-text"
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
              {/* Both sections are slices of the same `options` array, so every row has one index the arrow keys and
                  `aria-activedescendant` agree on — including the recents, which used to be unreachable. */}
              {showRecent && <ListHeading>{t("plan.recentSearches")}</ListHeading>}
              {showRecent &&
                recentStations.map((station, index) => (
                  <StationOption
                    key={`recent-${station.id}`}
                    station={station}
                    name={stationName(station, locale)}
                    index={index}
                    active={isDesktop && activeIndex === index}
                    disabled={station.id === excludeId}
                    onSelect={select}
                    onHover={hover}
                    id={optionId(index)}
                    icon={RECENT_ICON}
                  />
                ))}
              {showRecent && <ListHeading>{t("plan.allStations")}</ListHeading>}
              {results.map((station, resultIndex) => {
                const index = recentCount + resultIndex
                return (
                  <StationOption
                    key={station.id}
                    station={station}
                    name={stationName(station, locale)}
                    index={index}
                    // The keyboard highlight is a desktop affordance; on a phone it would read as a selection.
                    active={isDesktop && activeIndex === index}
                    selected={station.id === value?.id}
                    disabled={station.id === excludeId}
                    onSelect={select}
                    onHover={hover}
                    id={optionId(index)}
                  />
                )
              })}
              {results.length === 0 && <li className="px-3 py-8 text-center text-muted">{t("plan.noResults")}</li>}
            </ul>
          </>
        )}
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

/** Memoised: hovering moves the highlight, and without this every row of the list would reconcile on the way past. */
const StationOption = memo(function StationOption({
  station,
  name,
  index,
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
  /** Its place in the picker's flat option list — reported back on hover */
  index: number
  active: boolean
  selected?: boolean
  disabled?: boolean
  onSelect: (station: Station) => void
  onHover: (index: number) => void
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
      onMouseMove={() => onHover(index)}
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
})
