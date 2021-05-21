import { RecentSearchesModel } from "./recent-searches"

test("can be created", () => {
  const instance = RecentSearchesModel.create({})

  expect(instance).toBeTruthy()
})
