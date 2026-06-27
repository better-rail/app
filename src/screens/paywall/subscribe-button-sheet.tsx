import { BlurView } from "expo-blur"
import { ActivityIndicator, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated, { FadeIn } from "react-native-reanimated"
import { color } from "@/theme"
import { useIsDarkMode } from "@/hooks/use-is-dark-mode"
import { TouchableOpacity } from "react-native-gesture-handler"
import LinearGradient from "react-native-linear-gradient"
import { PRESSABLE_BASE, Text } from "@/components"
import { SubscriptionTypes } from "./"
import { translate } from "@/i18n"
import { useFontFamily } from "@/hooks/use-font-family"

interface SubscribeButtonSheetProps {
  subscriptionType: SubscriptionTypes
  onPress: () => void
  isLoading: boolean
}

export function SubscribeButtonSheet({ subscriptionType, onPress, isLoading }: SubscribeButtonSheetProps) {
  const isDarkMode = useIsDarkMode()

  const { fontFamily, isHeebo } = useFontFamily()

  return (
    <View style={styles.bottomFloatingView}>
      <GradientButton
        title={translate("paywall.startFreeTrial")}
        subtitle={
          <>
            {subscriptionType === "annual" && (
              <Animated.View entering={FadeIn}>
                <Text style={[styles.subscriptionButtonSubtitle, { fontFamily }]}>
                  {translate("paywall.afterTrialPrice", { price: "59.90₪", period: translate("paywall.year") })}
                </Text>
              </Animated.View>
            )}
            {subscriptionType === "monthly" && (
              <Animated.View entering={FadeIn}>
                <Text style={[styles.subscriptionButtonSubtitle, { fontFamily }]}>
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
        style={styles.blur}
      />
    </View>
  )
}

const GradientButton = ({ onPress, contentStyle, titleStyle, colors, title, subtitle, isLoading }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={colors} style={[PRESSABLE_BASE, { minHeight: 70 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {isLoading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator color={color.whiteText} />
          </View>
        ) : (
          <View style={[styles.contentWrapper, contentStyle]}>
            <Text style={[styles.subscriptionButtonTitle, titleStyle]}>{title}</Text>
            <Text style={[styles.subscriptionButtonSubtitle, titleStyle]}>{subtitle}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  bottomFloatingView: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
    height: 97.5 + rt.insets.bottom,
  },
  blur: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: -1,
  },
  loadingWrapper: {
    marginTop: 8,
  },
  contentWrapper: {
    alignItems: "center",
    marginTop: -4,
  },
  subscriptionButtonTitle: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 18,
  },
  subscriptionButtonSubtitle: {
    color: theme.colors.whiteText,
    textAlign: "center",
    letterSpacing: -0.2,
  },
}))
