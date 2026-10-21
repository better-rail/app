// Kill-switches for UI that relied on the retired Israel Railways API endpoints.

export const HIDE_RAIL_SERVICE_UPDATES = true

/**
 * Development only: the status screens show a made-up snapshot with every kind of disruption, for
 * working on them while no trains run. Set EXPO_PUBLIC_SIMULATE_SERVICE_STATUS=true in `.env.local`
 * and restart Metro with `-c`. Gated on __DEV__ so a release build can never serve it.
 */
export const SIMULATE_SERVICE_STATUS = __DEV__ && process.env.EXPO_PUBLIC_SIMULATE_SERVICE_STATUS === "true"
