import type { ReactNode } from "react"

export type RenameFavoritePrompt = {
  open: () => void
  // Rendered by the caller; only Android has an in-tree dialog
  dialog: ReactNode
}
