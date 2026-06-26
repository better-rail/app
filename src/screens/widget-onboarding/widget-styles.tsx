import { useSafeAreaInsets } from "react-native-safe-area-context"
import { spacing } from "../../theme"
import { ViewStyle } from "react-native"

export const useWidgetWrapperStyle = () => {
  const insets = useSafeAreaInsets()

  return { paddingHorizontal: spacing[5], marginTop: spacing[6] + insets.top } as ViewStyle
}
