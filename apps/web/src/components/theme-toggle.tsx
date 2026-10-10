import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { useT } from "@/i18n"
import { themePreference } from "@/lib/storage"
import { cn } from "@/lib/cn"

function subscribeToThemeClass(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

const isDarkNow = () => document.documentElement.classList.contains("dark")

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const dark = useSyncExternalStore(subscribeToThemeClass, isDarkNow, () => false)

  const toggle = () => {
    const next = dark ? "light" : "dark"
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    // Matching the OS clears the override.
    themePreference.set((next === "dark") === systemDark ? null : next)
  }

  return (
    <button type="button" className={cn("icon-btn", className)} aria-pressed={dark} aria-label={t("nav.darkMode")} onClick={toggle}>
      {/* CSS picks the icon so SSR matches the theme. */}
      <Moon className="size-5 dark:hidden" />
      <Sun className="hidden size-5 dark:block" />
    </button>
  )
}
