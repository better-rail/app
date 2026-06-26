import { create } from "zustand"

type Station = { id: string }

export interface RecentSearchEntry {
  id: string
  updatedAt: number
}

export interface RecentSearchesState {
  entries: RecentSearchEntry[]
}

export interface RecentSearchesActions {
  save: (station: Station) => void
  remove: (stationId: string) => void
}

export type RecentSearchesStore = RecentSearchesState & RecentSearchesActions

const initialRecentSearchesState: RecentSearchesState = {
  entries: [],
}

export const resetRecentSearchesStore = () => useRecentSearchesStore.setState(initialRecentSearchesState)

export const useRecentSearchesStore = create<RecentSearchesStore>((set, get) => ({
  ...initialRecentSearchesState,

  save(station) {
    const { entries } = get()
    const existingEntry = entries.find((entry) => entry.id === station.id)

    if (existingEntry) {
      const entryIndex = entries.indexOf(existingEntry)
      const updatedEntry = { ...existingEntry, updatedAt: new Date().getTime() }
      const updatedEntries = [...entries.slice(0, entryIndex), updatedEntry, ...entries.slice(entryIndex + 1)]
      set({ entries: updatedEntries })
    } else {
      set({ entries: [...entries, { id: station.id, updatedAt: new Date().getTime() }] })
    }
  },

  remove(stationId) {
    const { entries } = get()
    set({ entries: entries.filter((station) => station.id !== stationId) })
  },
}))

export function getRecentSearchesSnapshot(state: RecentSearchesState) {
  return { entries: state.entries }
}

export function hydrateRecentSearchesStore(data: any) {
  if (!data) return
  useRecentSearchesStore.setState({
    entries: data.entries ?? [],
  })
}
