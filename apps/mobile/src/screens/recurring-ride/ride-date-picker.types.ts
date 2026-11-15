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
