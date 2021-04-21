import { VoucherDetailsModel } from "./voucher-details"

test("can be created", () => {
  const instance = VoucherDetailsModel.create({})

  expect(instance).toBeTruthy()
})
