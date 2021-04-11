import { parseApiDate } from "./date-helpers"

it("parses the date correctly", () => {
  const apiDate = "14/04/2021 07:05:00"
  const targetDate = "04/14/2021 07:05:00"
  const formattedDate = parseApiDate(apiDate)

  expect(formattedDate).toBe(Date.parse(targetDate))
})

it("throws when invalid date is provided", () => {
  const invalidDate = "04/14/2021 07:05:00"
  expect(() => parseApiDate(invalidDate)).toThrow()
})
