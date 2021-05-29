import { PlatformColor, DynamicColorIOS as BaseDynamicColorIOS, Platform } from "react-native"
import { palette } from "./palette"

// Avoids crashing when called on other platforms
const DynamicColorIOS = Platform.select({
  ios: BaseDynamicColorIOS,
  default: () => null,
})

/**
 * Roles for colors.  Prefer using these over the palette.  It makes it easier
 * to change things.
 *
 * The only roles we need to place in here are the ones that span through the app.
 *
 * If you have a specific use-case, like a spinner color.  It makes more sense to
 * put that in the <Spinner /> component.
 */
export const color = {
  /**
   * The palette is available to use, but prefer using the name.
   */
  palette,
  /**
   * A helper for making something see-thru. Use sparingly as many layers of transparency
   * can cause older Android devices to slow down due to the excessive compositing required
   * by their under-powered GPUs.
   */
  transparent: "rgba(0, 0, 0, 0)",

  background: Platform.select({
    ios: PlatformColor("secondarySystemBackground"),
    android: PlatformColor("@color/background"),
  }),

  secondaryBackground: Platform.select({
    ios: PlatformColor("systemBackground"),
    android: PlatformColor("@color/secondaryBackground"),
  }),

  tertiaryBackground: Platform.select({
    ios: PlatformColor("tertiarySystemBackground"),
    android: PlatformColor("@color/background"),
  }),

  modalBackground: Platform.select({
    ios: DynamicColorIOS({ light: PlatformColor("secondarySystemBackground"), dark: PlatformColor("systemBackground") }),
    android: PlatformColor("@color/background"),
  }),

  primary: Platform.select({
    ios: PlatformColor("systemBlue"),
    android: PlatformColor("@color/blue"),
  }),

  primaryLighter: palette.blueLighter,
  primaryDarker: palette.blueDarker,

  secondary: Platform.select({
    ios: DynamicColorIOS({ light: palette.pinky, dark: "#6F68DF" }),
    android: PlatformColor("@color/pinky"),
  }),

  secondaryLighter: Platform.select({
    ios: DynamicColorIOS({ light: palette.orangeLighter, dark: "#464552" }),
    android: PlatformColor("@color/lightPinky"),
  }),

  inputBackground: Platform.select({
    ios: DynamicColorIOS({ light: PlatformColor("systemBackground"), dark: PlatformColor("systemGray5") }),
    android: PlatformColor("@color/inputBackground"),
  }),

  line: palette.offWhite,

  text: Platform.select({
    ios: PlatformColor("label"),
    android: PlatformColor("@color/label"),
  }),

  whiteText: Platform.select({
    ios: DynamicColorIOS({ light: palette.white, dark: palette.offWhite }),
    android: PlatformColor("@color/whiteText"),
  }),

  label: Platform.select({
    ios: PlatformColor("secondaryLabel"),
    android: PlatformColor("@color/secondaryLabel"),
  }),

  placeholder: Platform.select({
    ios: PlatformColor("placeholderText"),
    android: PlatformColor("@color/placeholderText"),
  }),

  inputPlaceholderBackground: Platform.select({
    ios: DynamicColorIOS({ light: palette.lighterGrey, dark: PlatformColor("systemGray4") }),
    android: PlatformColor("@color/inputPlaceholderBackground"),
  }),

  disabled: Platform.select({
    ios: DynamicColorIOS({ light: PlatformColor("systemGray2"), dark: PlatformColor("systemGray3") }),
    android: PlatformColor("@color/disabled"),
  }),

  link: Platform.select({
    ios: PlatformColor("link"),
    android: PlatformColor("@color/link"),
  }),

  separator: Platform.select({
    ios: PlatformColor("separator"),
    android: PlatformColor("@color/separator"),
  }),

  success: Platform.select({
    ios: PlatformColor("systemGreen"),
    android: PlatformColor("@color/green"),
  }),

  destroy: Platform.select({
    ios: PlatformColor("systemRed"),
    android: PlatformColor("@color/red"),
  }),

  dim: palette.lightGrey,

  dimmer: Platform.select({
    ios: DynamicColorIOS({ light: palette.lighterGrey, dark: PlatformColor("systemGray4") }),
    android: PlatformColor("@color/lightGrey"),
  }),

  error: palette.angry,

  yellow: Platform.select({
    ios: PlatformColor("systemYellow"),
    android: "yellow",
  }),

  /**
   * Storybook background for Text stories, or any stories where
   * the text color is color.text, which is white by default, and does not show
   * in Stories against the default white background
   */
  storybookDarkBg: palette.black,

  /**
   * Storybook text color for stories that display Text components against the
   * white background
   */
  storybookTextColor: palette.black,
}
