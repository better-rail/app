import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { Pressable, Image, Platform } from "react-native"
import Animated from "react-native-reanimated"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { HeaderBackButton as BackButton } from "expo-router/react-navigation"

const CHEVRON = require("../../../assets/chevron.png")

/**
 * @param sharedTransitionTag Tags the outermost view, so the shared view covers the whole button. A wrapper around
 *   the button would cut off the part that its negative margin pulls outside, and with it that part of the touch area.
 */
export function HeaderBackButton({ sharedTransitionTag }: { sharedTransitionTag?: string }) {
  const router = useRouter()

  if (isLiquidGlassSupported) {
    return (
      <Animated.View sharedTransitionTag={sharedTransitionTag}>
        <Pressable testID="header-back-button" onPress={() => router.back()}>
          <GlassView isInteractive colorScheme="dark" style={styles.liquidWrapper}>
            <Image source={CHEVRON} style={styles.icon} />
          </GlassView>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <Animated.View testID="header-back-button" sharedTransitionTag={sharedTransitionTag} style={styles.backButtonWrapper}>
      <BackButton tintColor="rgba(211, 211, 211, 0.9)" onPress={() => router.back()} />
    </Animated.View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  liquidWrapper: {
    width: 45,
    height: 45,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    width: 10,
    height: 18,
    marginLeft: -theme.spacing[0],
    tintColor: "lightgrey",
    opacity: 0.9,
    transform: rt.rtl ? [{ rotate: "180deg" }] : [{ rotate: "0deg" }],
  },
  backButtonWrapper: {
    marginLeft: Platform.select({ android: -theme.spacing[4], ios: -theme.spacing[3] }),
  },
}))
