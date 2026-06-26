import { BlurView } from "expo-blur"
import { ActivityIndicator, Platform, TextStyle, View, ViewStyle } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { color } from "../../theme"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { TouchableOpacity } from "react-native-gesture-handler"
import LinearGradient from "react-native-linear-gradient"
import { PRESSABLE_BASE, Text } from "../../components"
import { SubscriptionTypes } from "./"
import { translate } from "../../i18n"
import { useFontFamily } from "../../hooks/use-font-family"

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
  onPress: () => void
  isLoading: boolean
}

export function SubscribeButtonSheet({ subscriptionType, onPress, isLoading }: SubscribeButtonSheetProps) {
  const insets = useSafeAreaInsets()
  const isDarkMode = useIsDarkMode()

  const { fontFamily, isHeebo } = useFontFamily()

  return (
    <View style={[BOTTOM_FLOATING_VIEW, { height: 97.5 + insets.bottom }]}>
      <GradientButton
        title={translate("paywall.startFreeTrial")}
        subtitle={
          <>
            {subscriptionType === "annual" && (
              <Animated.View entering={FadeIn}>
                <Text style={[SUBSCRIPTION_BUTTON_SUBTITLE, { fontFamily }]}>
                  {translate("paywall.afterTrialPrice", { price: "59.90₪", period: translate("paywall.year") })}
                </Text>
              </Animated.View>
            )}
            {subscriptionType === "monthly" && (
              <Animated.View entering={FadeIn}>
                <Text style={[SUBSCRIPTION_BUTTON_SUBTITLE, { fontFamily }]}>
                  {translate("paywall.afterTrialPrice", { price: "6.90₪", period: translate("paywall.month") })}.{" "}
                  {translate("paywall.cancelAnytime")}
                </Text>
              </Animated.View>
            )}
          </>
        }
        onPress={onPress}
        isLoading={isLoading}
        titleStyle={{ fontFamily, color: color.whiteText }}
        contentStyle={{ gap: isHeebo ? 1 : 6 }}
        colors={isDarkMode ? ["#5E17EB", "#9432C2"] : ["#7B1AEC", "#5755F2"]}
      />
      <BlurView
        tint={isDarkMode ? "systemUltraThinMaterialDark" : "systemThinMaterialDark"}
        intensity={10}
        style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }}
      />
    </View>
  )
}

const SUBSCRIPTION_BUTTON_TITLE: TextStyle = {
  textAlign: "center",
  fontWeight: "600",
  fontSize: 18,
}

const SUBSCRIPTION_BUTTON_SUBTITLE: TextStyle = {
  color: color.whiteText,
  textAlign: "center",
  letterSpacing: -0.2,
}

const GradientButton = ({ onPress, contentStyle, titleStyle, colors, title, subtitle, isLoading }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={colors} style={[PRESSABLE_BASE, { minHeight: 70 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {isLoading ? (
          <View style={{ marginTop: 8 }}>
            <ActivityIndicator color={color.whiteText} />
          </View>
        ) : (
          <View style={[{ alignItems: "center", marginTop: -4 }, contentStyle]}>
            <Text style={[SUBSCRIPTION_BUTTON_TITLE, titleStyle]}>{title}</Text>
            <Text style={[SUBSCRIPTION_BUTTON_SUBTITLE, titleStyle]}>{subtitle}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}
