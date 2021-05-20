import { Instance, SnapshotOut, types } from "mobx-state-tree"

const RecentSearchEntry = {
  id: types.string,
  name: types.string,
  updatedAt: types.Date,
}

export const RecentSearchesModel = types
  .model("RecentSearches")
  .props({
    entries: types.array(types.model(RecentSearchEntry)),
  })
  .actions((self) => ({
    saveRecentSearch(station) {
      const existingEntry = self.entries.find((entry) => entry.id === station.id)

      // If the station already exists in the entries array, update it's `updatedAt` property.
      if (existingEntry) {
        const entryIndex = self.entries.indexOf(existingEntry)
        const updatedEntry = Object.assign(existingEntry, { updatedAt: new Date() })
        const updatedEntries = [...self.entries.splice(0, entryIndex), updatedEntry, ...self.entries.splice(entryIndex + 1)]
        self.entries.replace(updatedEntries)
      } else {
        self.entries.push({ ...station, updatedAt: new Date() })
      }
    },
  }))

type RecentSearchesType = Instance<typeof RecentSearchesModel>
export interface RecentSearches extends RecentSearchesType {}
type RecentSearchesSnapshotType = SnapshotOut<typeof RecentSearchesModel>
export interface RecentSearchesSnapshot extends RecentSearchesSnapshotType {}
export const createRecentSearchesDefaultModel = () => types.optional(RecentSearchesModel, {})
