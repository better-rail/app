export type MenuPickerOption<T extends string> = { value: T; label: string }

/** A settings row with a label and its selected value, which opens a menu of the options. */
export interface MenuPickerProps<T extends string> {
  label: string
  value: T
  options: MenuPickerOption<T>[]
  onChange: (value: T) => void
  testID?: string
}
