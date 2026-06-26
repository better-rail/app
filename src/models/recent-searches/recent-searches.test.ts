import { useRecentSearchesStore } from "./recent-searches"

test("can be created with default state", () => {
  const state = useRecentSearchesStore.getState()

  expect(state).toBeTruthy()
  expect(state.entries).toEqual([])
})
