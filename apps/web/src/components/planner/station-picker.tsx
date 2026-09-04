import { useEffect, useId, useRef, useState } from "react"
import { Search, X, ChevronDown, TrainFront, Clock } from "lucide-react"
import { stationName, getStationById, type Station } from "@/data/stations"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { useIsDesktop } from "@/hooks/use-media-query"
import { useRecentRoutes } from "@/hooks/use-stored"
import { useStationSearch } from "./use-station-search"
import { StationImage } from "../stations/station-image"
import { StationPhotoCard, PLANNER_CARD_HEIGHT } from "../stations/station-card"

export interface StationPickerProps {
  label: string
  value: Station | undefined
  onChange: (station: Station) => void
  /** The station selected in the other field — shown dimmed so it can't be picked twice */
  exclude?: Station
  /** `card` mimics the app's photo cards; `field` is the compact desktop input */
  variant?: "card" | "field"
  autoFocus?: boolean
  className?: string
  kind: "origin" | "destination"
}

export function StationPicker({ label, value, onChange, exclude, variant = "card", className, kind }: StationPickerProps) {
  const t = useT()
  const locale = useLocale()
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const { results } = useStationSearch(query)
  const recent = useRecentRoutes()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const recentStations = (() => {
    const ids = recent.map((route) => (kind === "origin" ? route.originId : route.destinationId))
    const unique = Array.from(new Set(ids))
      .map((id) => getStationById(id))
      .filter((station): station is Station => Boolean(station))
    return unique.slice(0, 4)
  })()

  const showRecent = query.trim() === "" && recentStations.length > 0

  useEffect(() => {
    if (!open) return
    setQuery("")
    setActiveIndex(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    if (!isDesktop) document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, isDesktop])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const select = (station: Station) => {
    if (station.id === exclude?.id) return
    onChange(station)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const station = results[activeIndex]
      if (station) select(station)
    }
  }

  const name = value ? stationName(value, locale) : undefined

  const trigger =
    variant === "card" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group block w-full text-start transition-transform duration-200 ease-out-expo active:scale-[0.98]"
      >
        <span className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        {value ? (
          <StationPhotoCard station={value} name={name ?? ""} className="shadow-card group-hover:shadow-card-hover" />
        ) : (
          <span
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-surface-2 text-muted transition-colors group-hover:border-brand/50 group-hover:text-brand-text",
              PLANNER_CARD_HEIGHT,
            )}
          >
            <TrainFront className="size-8 opacity-60" />
            <span className="font-medium">{t("plan.selectStation")}</span>
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-start shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] transition-colors hover:border-line-strong",
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
        <ChevronDown className="size-4 shrink-0 text-dim" />
      </button>
    )

  const list = (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Search className="size-[18px] shrink-0 text-dim" />
        <input
          ref={inputRef}
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
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-dim"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="icon-btn size-8" aria-label={t("nav.close")}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        className="scrollbar-thin max-h-[min(60vh,480px)] flex-1 overflow-y-auto p-1.5 lg:max-h-[420px]"
      >
        {showRecent && (
          <li role="presentation" className="px-2.5 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wide text-dim">
            {t("plan.recentSearches")}
          </li>
        )}
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
        {showRecent && (
          <li role="presentation" className="px-2.5 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide text-dim">
            {t("plan.allStations")}
          </li>
        )}
        {results.map((station, index) => (
          <StationOption
            key={station.id}
            station={station}
            name={stationName(station, locale)}
            active={index === activeIndex}
            selected={station.id === value?.id}
            disabled={station.id === exclude?.id}
            onSelect={select}
            onHover={() => setActiveIndex(index)}
            id={`${listboxId}-${station.id}`}
          />
        ))}
        {results.length === 0 && <li className="px-3 py-8 text-center text-muted">{t("plan.noResults")}</li>}
      </ul>
    </>
  )

  return (
    <div ref={rootRef} className={cn("relative", open && "z-50", className)}>
      {trigger}

      {open && isDesktop && (
        <div
          role="dialog"
          aria-label={label}
          className="animate-fade-up absolute inset-x-0 top-full z-50 mt-2 flex min-w-[320px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        >
          {list}
        </div>
      )}

      {open && !isDesktop && (
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex flex-col bg-bg">
          <div className="flex items-center gap-2 border-b border-line bg-surface px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
            <span className="flex-1 truncate ps-1 text-[17px] font-bold">{label}</span>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost h-9 px-3 text-[15px]">
              {t("nav.close")}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-surface">{list}</div>
        </div>
      )}
    </div>
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
  icon?: React.ReactNode
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
        "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
        active && "bg-brand-soft",
        !active && "hover:bg-surface-3",
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
