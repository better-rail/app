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
const DISCORD_INVITE_URL = "https://discord.gg/uJ65ABeQsh"
const ICON_SIZE = 22

async function openSocial(network: "x" | "instagram" | "discord", deepLink: string, webUrl: string) {
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

function DiscordLogo({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill={color}
        d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
      />
    </Svg>
  )
}

export function SocialLinks() {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Instagram"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => openSocial("instagram", INSTAGRAM_DEEP_LINK, INSTAGRAM_WEB_URL)}
      >
        <InstagramLogo color={color.dim as string} />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Discord"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => openSocial("discord", DISCORD_INVITE_URL, DISCORD_INVITE_URL)}
      >
        <DiscordLogo color={color.dim as string} />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="X"
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => openSocial("x", X_DEEP_LINK, X_WEB_URL)}
      >
        <XLogo color={color.dim as string} />
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
