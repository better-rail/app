import { RoutePlanModel } from "./route-plan"

test("can be created", () => {
  const instance = RoutePlanModel.create({ origin: "ירושלים", destination: "תל אביב" })

  expect(instance.origin).toBe("ירושלים")
  expect(instance.destination).toBe("תל אביב")
})
