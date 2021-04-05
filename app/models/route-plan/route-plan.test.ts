import { types, getSnapshot, onPatch } from "mobx-state-tree"
import { RoutePlan, RoutePlanModel } from "./route-plan"

test("can be created", () => {
  const origin = {
    name: "ירושלים - יצחק נבון",
    id: "680",
  }

  const destination = {
    name: "הרצליה",
    id: "3500",
  }

  const instance = RoutePlanModel.create({ origin, destination })

  const patches = []
  onPatch(instance, (patch) => {
    patches.push(patch)
  })

  instance.setDate(new Date("2021-04-05T02:24:00"))

  expect(patches).toMatchSnapshot()
})
