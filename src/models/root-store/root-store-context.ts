// This file previously contained the useStores() hook which has been replaced
// by direct store imports with selectors for better performance.
//
// Import individual store hooks directly:
//   import { useRoutePlanStore } from "../route-plan/route-plan"
//   import { useSettingsStore } from "../settings/settings"
//   etc.
//
// Use selectors to avoid unnecessary re-renders:
//   const value = useXStore((s) => s.value)
//   const { a, b } = useXStore(useShallow((s) => ({ a: s.a, b: s.b })))
