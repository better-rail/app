import { type EffectCallback, useEffect } from "react"

/**
 * Runs an effect once when the component mounts.
 *
 * Note: React Strict Mode may remount components in development.
 */
export function useMountEffect(effect: EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [])
}
