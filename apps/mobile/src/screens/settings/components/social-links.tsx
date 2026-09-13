import { Linking, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Svg, Path } from "react-native-svg"
import { color } from "@/theme"
import { openLink } from "@/utils/helpers/open-link"
import { trackEvent } from "@/services/analytics"

const X_DEEP_LINK = "twitter://user?screen_name=better_rail"
const X_WEB_URL = "https://x.com/better_rail"
const INSTAGRAM_DEEP_LINK = "instagram://user?username=better_rail"
const INSTAGRAM_WEB_URL = "https://instagram.com/better_rail"
const ICON_SIZE = 22

async function openSocial(network: "x" | "instagram", deepLink: string, webUrl: string) {
  trackEvent("social_link_press", { source: "settings", network })
  // openURL isn't gated by LSApplicationQueriesSchemes / <queries>; it rejects when no app handles the scheme.
  try {
    await Linking.openURL(deepLink)
  } catch {
    await openLink(webUrl)
  }
}

function XLogo({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill={color}
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </Svg>
  )
}

function InstagramLogo({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill={color}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"
      />
    </Svg>
  )
}

export function SocialLinks() {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="X"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => openSocial("x", X_DEEP_LINK, X_WEB_URL)}
      >
        <XLogo color={color.dim as string} />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Instagram"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => openSocial("instagram", INSTAGRAM_DEEP_LINK, INSTAGRAM_WEB_URL)}
      >
        <InstagramLogo color={color.dim as string} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing[4],
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  button: {
    width: ICON_SIZE + theme.spacing[2],
    height: ICON_SIZE + theme.spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
}))
