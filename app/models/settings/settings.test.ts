import { SettingsModel } from "./settings"

test("can be created", () => {
  const instance = SettingsModel.create({})

  expect(instance).toBeTruthy()
})
