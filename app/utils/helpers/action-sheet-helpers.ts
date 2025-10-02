import { ColorSchemeName } from "react-native"
import { color } from "../../theme"

export function getActionSheetStyleOptions(colorScheme: ColorSchemeName) {
  return colorScheme === "dark"
    ? {
        containerStyle: { backgroundColor: color.modalBackground },
        separatorStyle: { backgroundColor: color.separator },
        textStyle: { color: color.text },
        titleTextStyle: { color: color.text },
      }
    : {}
}
