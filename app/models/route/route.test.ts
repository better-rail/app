import { trainRoutessModel } from "./route"

test("can be created", () => {
  const instance = trainRoutessModel.create({})

  expect(instance).toBeTruthy()
})
