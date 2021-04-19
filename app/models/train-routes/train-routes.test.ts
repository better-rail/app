import { trainRoutesModel } from "./train-routes"

test("can be created", () => {
  const instance = trainRoutesModel.create({})

  expect(instance).toBeTruthy()
})
