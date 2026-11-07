import React, { useState } from "react"
import { StyleSheet } from "react-native"
import { AlertDialog, Host, Text as ComposeText, TextButton, TextField, useNativeState } from "@expo/ui/jetpack-compose"
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers"
import { primaryFont } from "@/theme"
import { translate } from "@/i18n"
import type { RenameFavoritePrompt } from "./rename-favorite-prompt.types"

const TEXT_STYLE = { fontFamily: primaryFont, fontSize: 16 }

export function useRenameFavoritePrompt(label: string | undefined, onSave: (label: string) => void): RenameFavoritePrompt {
  const [visible, setVisible] = useState(false)
  const text = useNativeState(label ?? "")
  const selection = useNativeState({ start: 0, end: 0 })

  const open = () => {
    const current = label ?? ""
    text.set(current)
    // Select the existing label so typing replaces it (Compose otherwise puts the cursor at the start)
    selection.set({ start: 0, end: current.length })
    setVisible(true)
  }

  const close = () => setVisible(false)

  const save = () => {
    onSave(text.get())
    close()
  }

  const dialog = visible ? (
    <Host matchContents style={styles.host}>
      <AlertDialog onDismissRequest={close}>
        <AlertDialog.Title>
          <ComposeText style={{ ...TEXT_STYLE, fontSize: 22 }}>{translate("favorites.renamePromptTitle")}</ComposeText>
        </AlertDialog.Title>
        <AlertDialog.Text>
          <TextField
            value={text}
            selection={selection}
            autoFocus
            singleLine
            textStyle={TEXT_STYLE}
            keyboardOptions={{ capitalization: "sentences", imeAction: "done" }}
            keyboardActions={{ onDone: save }}
            modifiers={[fillMaxWidth()]}
          >
            <TextField.Placeholder>
              <ComposeText style={TEXT_STYLE}>{translate("favorites.renamePromptPlaceholder")}</ComposeText>
            </TextField.Placeholder>
          </TextField>
        </AlertDialog.Text>
        <AlertDialog.ConfirmButton>
          <TextButton onClick={save}>
            <ComposeText style={TEXT_STYLE}>{translate("common.save")}</ComposeText>
          </TextButton>
        </AlertDialog.ConfirmButton>
        <AlertDialog.DismissButton>
          <TextButton onClick={close}>
            <ComposeText style={TEXT_STYLE}>{translate("common.cancel")}</ComposeText>
          </TextButton>
        </AlertDialog.DismissButton>
      </AlertDialog>
    </Host>
  ) : null

  return { open, dialog }
}

// The dialog draws in its own window; keep the host out of the card's layout
const styles = StyleSheet.create({
  host: { position: "absolute", width: 0, height: 0 },
})
