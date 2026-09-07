import { cn } from "@/lib/cn"

export function AppIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[22%] bg-white shadow-[0_0_8px_rgb(0_0_0/0.15)] dark:bg-surface-3",
        className,
      )}
      aria-hidden="true"
    >
      <img src="/assets/images/icon.svg" alt="" className="h-[58%] w-auto" width={50} height={60} />
    </span>
  )
}
