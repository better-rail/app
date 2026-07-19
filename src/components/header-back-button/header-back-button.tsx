import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"
import { Pressable, Image, Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { HeaderBackButton as BackButton } from "expo-router/react-navigation"
import { useGuardedNavigation } from "@/hooks"

const CHEVRON = require("../../../assets/chevron.png")

export function HeaderBackButton() {
  const router = useGuardedNavigation()

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={() => router.back()}>
        <LiquidGlassView interactive colorScheme="dark" style={styles.liquidWrapper}>
          <Image source={CHEVRON} style={styles.icon} />
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <View style={styles.backButtonWrapper}>
      <BackButton tintColor="rgba(211, 211, 211, 0.9)" onPress={() => router.back()} />
    </View>
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
