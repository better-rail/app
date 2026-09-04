import { ArrowUpDown, ArrowLeftRight } from "lucide-react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

const ICON = "size-5 transition-transform duration-500 ease-out-expo group-hover:rotate-180"

/** The app's blue "flip stations" button; `responsive` switches from up/down to left/right arrows at `lg`. */
export function SwapButton({
  onClick,
  disabled,
  horizontal = false,
  responsive = false,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  horizontal?: boolean
  responsive?: boolean
  className?: string
}) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("plan.swap")}
      title={t("plan.swap")}
      className={cn(
        "group inline-flex size-11 items-center justify-center rounded-full bg-brand text-white shadow-[0_2px_8px_rgb(10_129_221/0.4)] transition-[transform,background-color] duration-300 ease-out-expo hover:bg-brand-strong active:scale-90 disabled:opacity-40 disabled:shadow-none",
        className,
      )}
    >
      {responsive ? (
        <>
          <ArrowUpDown className={cn(ICON, "lg:hidden")} />
          <ArrowLeftRight className={cn(ICON, "hidden lg:block")} />
        </>
      ) : horizontal ? (
        <ArrowLeftRight className={ICON} />
      ) : (
        <ArrowUpDown className={ICON} />
      )}
    </button>
  )
}
