/**
 * A list of preset names.
 *
 * The preset styles themselves live in `text.tsx` as a Unistyles `preset` variant group
 * (so they're theme-aware). This file just owns the public preset-name type.
 */
export type TextPresets = "default" | "bold" | "header" | "fieldLabel" | "secondary" | "small"
