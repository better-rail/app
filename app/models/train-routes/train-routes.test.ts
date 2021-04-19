import { trainRoutessModel } from "./train-routes"

test("can be created", () => {
  const instance = trainRoutessModel.create({})

  expect(instance).toBeTruthy()
})
