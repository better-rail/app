import { Alert } from "react-native"
import { translate } from "@/i18n"
import type { RenameFavoritePrompt } from "./rename-favorite-prompt.types"

// iOS: the system alert with a text field. Android renders a Material 3 dialog instead.
export function useRenameFavoritePrompt(label: string | undefined, onSave: (label: string) => void): RenameFavoritePrompt {
  const open = () => {
    Alert.prompt(
      translate("favorites.renamePromptTitle"),
      undefined,
      [
        { text: translate("common.cancel"), style: "cancel" },
        { text: translate("common.save"), onPress: (newLabel) => onSave(newLabel ?? "") },
      ],
      "plain-text",
      label,
    )
  }

  return { open, dialog: null }
}
