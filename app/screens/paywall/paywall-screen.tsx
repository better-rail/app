import { TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"
import { PRESSABLE_BASE, Text } from "../../components"
import { color, spacing } from "../../theme"
import { BlurView } from "@react-native-community/blur"
import { ScrollView } from "react-native-gesture-handler"
import { useState } from "react"
import { SubscriptionTypeBox, SubscriptionTypes } from "./subscription-type-box"
import LinearGradient from "react-native-linear-gradient"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from "react-native-reanimated"

// #region styles
const HEAD_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginBottom: spacing[4],
}

const BETTER_RAIL_PRO_TITLE: TextStyle = {
  marginBottom: spacing[0],
  textAlign: "center",
  fontSize: 28,
  fontFamily: "System",
  fontWeight: "600",
  letterSpacing: -0.9,
}

const BETTER_RAIL_PRO_SUBTITLE: TextStyle = {
  textAlign: "center",

  letterSpacing: -0.5,
  paddingHorizontal: 24,
}

const BOTTOM_FLOATING_VIEW: ViewStyle = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  height: 115,
  paddingTop: 12,
  paddingHorizontal: 16,
  borderTopWidth: 1,
  borderTopColor: color.separator,
}
// #endregion

export function PaywallScreen() {
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionTypes>("annual")
  const isDarkMode = useIsDarkMode()

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <ScrollView style={{ height: "100%" }} contentContainerStyle={{ paddingTop: 100 }}>
        <View style={HEAD_WRAPPER}>
          <View style={{ width: 200, height: 200, backgroundColor: "grey", borderRadius: 8, marginBottom: 24 }} />
          <Text style={BETTER_RAIL_PRO_TITLE}>Better Rail Pro</Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { paddingHorizontal: spacing[6], marginBottom: spacing[4] }]}>
            Supercharge your train travels and support the app development.
          </Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { fontWeight: "500", marginBottom: -4 }]}>Try free for 14 days.</Text>
          <Text style={BETTER_RAIL_PRO_SUBTITLE}>Afterwards, it’s less than a cup of coffee ☕️</Text>
        </View>

        <SubscriptionTypeBox value={subscriptionType} onChange={setSubscriptionType} />
      </ScrollView>
      <View style={BOTTOM_FLOATING_VIEW}>
        <GradientButton
          title="Start 14 days free trial"
          subtitle={
            <>
              {subscriptionType === "annual" && (
                <Animated.View entering={FadeIn}>
                  <Text
                    style={{
                      color: color.whiteText,
                      textAlign: "center",
                      fontSize: 14,
                      letterSpacing: -0.2,
                      fontFamily: "System",
                    }}
                  >
                    then ₪59.90 / year
                  </Text>
                </Animated.View>
              )}
              {subscriptionType === "monthly" && (
                <Animated.View entering={FadeIn}>
                  <Text
                    style={{
                      color: color.whiteText,
                      textAlign: "center",
                      fontSize: 14,
                      letterSpacing: -0.2,
                      fontFamily: "System",
                    }}
                  >
                    then ₪6.90 / month. Cancel anytime
                  </Text>
                </Animated.View>
              )}
            </>
          }
          onPress={() => {}}
          style={{ width: "100%" }}
          titleStyle={{ color: color.whiteText }}
          colors={["#7B1AEC", "#5755F2"]}
        />
        <BlurView
          blurType={isDarkMode ? "ultraThinMaterialDark" : "xlight"}
          style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }}
        />
      </View>
    </View>
  )
}

const GradientButton = ({ onPress, style, titleStyle, colors, title, subtitle }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={colors} style={[PRESSABLE_BASE, { minHeight: 70 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={{ alignItems: "center", marginTop: -3, gap: 6 }}>
          <Text style={[{ textAlign: "center", fontWeight: "600", fontSize: 18, fontFamily: "System" }, titleStyle]}>
            {title}
          </Text>
          <Text style={[{ textAlign: "center", fontSize: 14, letterSpacing: -0.2, fontFamily: "System" }, titleStyle]}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}
