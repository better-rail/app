import { Button } from "../../components"
import { translate } from "../../i18n"
import { fontScale } from "../../theme"

interface NextButtonProps {
  title?: string
  onPress: () => void
}

export function NextButton({ title, onPress }: NextButtonProps) {
  return (
    <Button
      title={title || translate("common.next")}
      variant="primary"
      containerStyle={{ minHeight: 60 * fontScale }}
      style={{ minHeight: 60 * fontScale, maxHeight: 60 * fontScale }}
      onPress={onPress}
    />
  )
}
