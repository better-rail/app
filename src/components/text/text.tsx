import * as React from "react"
import { Text as ReactNativeText } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import type { TextProps } from "./text.props"
import { translate } from "@/i18n"

/**
 * For your text displaying needs.
 *
 * This component is a HOC over the built-in React Native one.
 */
export function Text(props: TextProps) {
  // grab the props
  const { preset = "default", tx, txOptions, text, children, style: styleOverride, maxFontSizeMultiplier, ...rest } = props

  // figure out which content to use
  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children

  // Unistyles applies base styles when no variant matches, so "default" maps to "no variant".
  styles.useVariants({ preset: preset === "default" ? undefined : preset })

  return (
    <ReactNativeText {...rest} style={[styles.text, styleOverride]} maxFontSizeMultiplier={maxFontSizeMultiplier || 1.3}>
      {content}
    </ReactNativeText>
  )
}

/**
 * All text will start off looking like the base, then layer on a `preset` variant.
 */
const styles = StyleSheet.create((theme) => ({
  text: {
    fontFamily: theme.typography.primary,
    color: theme.colors.text,
    fontSize: 16,
    textAlign: "left",
    variants: {
      preset: {
        // (no `default` key — the base styles above ARE the default preset)
        // A bold version of the default text.
        bold: { fontWeight: "bold" },
        // Large headers.
        header: { fontSize: 32, fontWeight: "bold" },
        // Field labels that appear on forms above the inputs.
        fieldLabel: { fontSize: 13, color: theme.colors.label },
        // A smaller piece of secondary information.
        secondary: { fontSize: 9, color: theme.colors.dim },
        small: { fontSize: 14 },
      },
    },
  },
}))
