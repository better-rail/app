import { VouchersModel } from "./vouchers"

test("can be created", () => {
  const instance = VouchersModel.create({})

  expect(instance).toBeTruthy()
})
