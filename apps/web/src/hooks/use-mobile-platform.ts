import { useEffect, useState } from "react"
import { detectMobilePlatform, type MobilePlatform } from "@/lib/platform"

/**
 * The device's mobile OS, or `null` on desktop. Resolved after mount — the user agent does not exist during SSR,
 * so anything that depends on it has to render the desktop shape first and swap once hydrated.
 */
export function useMobilePlatform(): MobilePlatform | null {
  const [platform, setPlatform] = useState<MobilePlatform | null>(null)
  useEffect(() => setPlatform(detectMobilePlatform()), [])
  return platform
}
