// Feature kill-switches.
//
// The server no longer proxies the Israel Railways API (announcements, popup
// messages, station info are retired and answer empty), so the UI that depended
// on it is hidden for now. Flip a flag back to false to re-enable once the data
// has a new source.

// Train service updates: the updates button on the planner header, the urgent
// red announcement bar, and the announcements shown under "no trains found".
export const HIDE_RAIL_SERVICE_UPDATES = true

// Station activity hours sheet (was Israel Railways station info).
export const HIDE_STATION_HOURS = true
