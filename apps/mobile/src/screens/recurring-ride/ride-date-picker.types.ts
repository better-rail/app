/** A settings row with a label and a date, which opens the system date picker. */
export interface RideDatePickerProps {
  label: string
  /** "YYYY-MM-DD" */
  value: string
  /** The first and last pickable dates, "YYYY-MM-DD" */
  minimumDate: string
  maximumDate: string
  onChange: (date: string) => void
  testID?: string
}

/** Noon on a "YYYY-MM-DD" date, so a time zone shift can't move it to another day */
export const toPickerDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}
