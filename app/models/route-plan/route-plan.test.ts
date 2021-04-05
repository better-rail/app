import { getSnapshot } from "mobx-state-tree"
import { RoutePlanModel } from "./route-plan"

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

  expect(getSnapshot(instance)).toMatchSnapshot()
})
