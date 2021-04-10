import { parseApiDate } from "./date-helpers"

it("parses the date correctly", () => {
  const date1 = "14/04/2021 07:05:00"
  const formattedDate = parseApiDate(date1)

  expect(formattedDate).toBe(1618347600000)
})

it("throws when invalid date is provided", () => {
  const invalidDate = "04/14/2021 07:05:00"
  expect(() => parseApiDate(invalidDate)).toThrow()
})
