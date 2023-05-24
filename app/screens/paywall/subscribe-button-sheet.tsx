import { BlurView } from "@react-native-community/blur"
import React from "react"
import { View, ViewStyle } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { color } from "../../theme"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { TouchableOpacity } from "react-native-gesture-handler"
import LinearGradient from "react-native-linear-gradient"
import { PRESSABLE_BASE, Text } from "../../components"
import { SubscriptionTypes } from "./subscription-type-box"

const BOTTOM_FLOATING_VIEW: ViewStyle = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  paddingTop: 12,
  paddingHorizontal: 16,
  borderTopWidth: 1,
  borderTopColor: color.separator,
}

interface SubscribeButtonSheetProps {
  subscriptionType: SubscriptionTypes
}

export function SubscribeButtonSheet({ subscriptionType }: SubscribeButtonSheetProps) {
  const insets = useSafeAreaInsets()
  const isDarkMode = useIsDarkMode()

  return (
    <View style={[BOTTOM_FLOATING_VIEW, { height: 97.5 + insets.bottom }]}>
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
