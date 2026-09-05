import { ArrowUpDown, ArrowLeftRight } from "lucide-react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

const ICON = "size-5 transition-transform duration-500 ease-out-expo group-hover:rotate-180"

/** Up/down arrows below the breakpoint (the fields are stacked there), left/right from it on. */
const RESPONSIVE_ICONS = {
  sm: { vertical: "sm:hidden", horizontal: "hidden sm:block" },
  lg: { vertical: "lg:hidden", horizontal: "hidden lg:block" },
}

/** The app's blue "flip stations" button; `responsive` names the breakpoint where the arrows turn horizontal. */
export function SwapButton({
  onClick,
  disabled,
  horizontal = false,
  responsive,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  horizontal?: boolean
  responsive?: keyof typeof RESPONSIVE_ICONS
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
          <ArrowUpDown className={cn(ICON, RESPONSIVE_ICONS[responsive].vertical)} />
          <ArrowLeftRight className={cn(ICON, RESPONSIVE_ICONS[responsive].horizontal)} />
        </>
      ) : horizontal ? (
        <ArrowLeftRight className={ICON} />
      ) : (
        <ArrowUpDown className={ICON} />
      )}
    </button>
  )
}
