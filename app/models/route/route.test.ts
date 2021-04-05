import { RouteModel } from "./route"

test("can be created", () => {
  const instance = RouteModel.create({})

  expect(instance).toBeTruthy()
})
