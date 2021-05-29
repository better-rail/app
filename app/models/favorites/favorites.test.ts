import { FavoritesModel } from "./favorites"

test("can be created", () => {
  const instance = FavoritesModel.create({})

  expect(instance).toBeTruthy()
})
