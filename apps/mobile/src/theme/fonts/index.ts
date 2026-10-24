import * as Font from "expo-font"

// Theme fonts for route times (`alternateTimeFont`) and headings (`headingFont`) in ../accent-themes.ts.
// Heebo is embedded natively. The OFL fonts sit next to their licenses; Doto's colon is redrawn as two dots.
// Fontef's Tel Aviv is licensed to Better Rail's app only, so it lives in the gitignored licensed/ folder.
export const initFonts = async () => {
  try {
    await Font.loadAsync({
      Doto: require("../../../assets/fonts/Doto-LED.ttf"),
      Micro5: require("../../../assets/fonts/Micro5-Regular.ttf"),
      FrankRuhlLibre: require("../../../assets/fonts/FrankRuhlLibre-Black.ttf"),
      BebasNeue: require("../../../assets/fonts/BebasNeue-Regular.ttf"),
      TelAvivBrutalist: require("../../../assets/fonts/licensed/TelAviv-BrutalistBold.ttf"),
      TelAvivBrutalistRegular: require("../../../assets/fonts/licensed/TelAviv-BrutalistRegular.ttf"),
      TelAvivModernistRegular: require("../../../assets/fonts/licensed/TelAviv-ModernistRegular.ttf"),
    })
  } catch {
    // Text falls back to Heebo; never block startup on a decorative font
  }
}
