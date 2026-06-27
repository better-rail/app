import { Platform } from "react-native"

// Heebo is now registered on both platforms (see the expo-font config in app.config.ts —
// iOS by family name, Android via an XML font family + ReactFontManager). Kept named
// `primaryFontIOS` for backwards compatibility with the layout nudges that import it.
export const primaryFontIOS = "Heebo"

/**
 * You can find a list of available fonts on both iOS and Android here:
 * https://github.com/react-native-training/react-native-fonts
 *
 * If you're interested in adding a custom font to your project,
 * check out the readme file in ./assets/fonts/ then come back here
 * and enter your new font name.
 *
 * The various styles of fonts are defined in the <Text /> component.
 */
export const typography = {
  /**
   * The primary font.  Used in most places.
   */
  primary: Platform.select({ ios: primaryFontIOS, android: "Heebo" }),

  /**
   * An alternate font used for perhaps titles and stuff.
   */
  secondary: Platform.select({ ios: "Arial", android: "sans-serif" }),

  /**
   * Lets get fancy with a monospace font!
   */
  code: Platform.select({ ios: "Courier", android: "monospace" }),
}
