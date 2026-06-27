import { StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text, CloseButton } from "@/components"
import { color, spacing } from "@/theme"
import { useState } from "react"
import { SubscriptionTypeBox, SubscriptionTypes } from "./subscription-type-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SubscribeButtonSheet } from "./subscribe-button-sheet"
import { FeaturesBox } from "./paywall-features-box"
import { isRTL, translate } from "@/i18n"
import { BlurView } from "expo-blur"
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"
import { Header, HeaderBackButton, useHeaderHeight } from "expo-router/react-navigation"
import { useRouter } from "expo-router"
import { Stack } from "expo-router/stack"
import * as Burnt from "burnt"

// #region styles
const HEAD_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginBottom: spacing[5],
}

const BETTER_RAIL_PRO_TITLE: TextStyle = {
  marginBottom: spacing[0],
  textAlign: "center",
  fontSize: 28,
  fontWeight: "700",
  fontFamily: "System",
  letterSpacing: -0.85,
}

const BETTER_RAIL_PRO_SUBTITLE: TextStyle = {
  textAlign: "center",
  letterSpacing: -0.4,
  paddingHorizontal: 24,
  fontSize: isRTL ? 18 : 16,
}

// #endregion

export function PaywallScreen() {
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionTypes>("annual")
  const [purchaseInProgres, setPurchaseInProgress] = useState(false)
  const router = useRouter()

  const insets = useSafeAreaInsets()
  const scrollPosition = useSharedValue(0)
  const headerHeight = useHeaderHeight()

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollPosition.value = event.contentOffset.y
  })

  const inputRange = [0, 195 + insets.top, 205 + insets.top]

  const headerOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(scrollPosition.value, inputRange, [0, 0, 1], Extrapolate.CLAMP)
    return { opacity }
  })

  const customHeader = () => (
    <Header
      title="Better Rail Pro"
      headerLeft={(props) => (
        <CloseButton
          onPress={() => router.back()}
          iconStyle={{ tintColor: color.grey }}
          accessibilityLabel={translate("common.close")}
        />
      )}
      headerTitle={() => (
        <Animated.Text style={[{ fontSize: 17, fontWeight: 600, color: color.text }, headerOpacity]}>
          Better Rail Pro
        </Animated.Text>
      )}
      headerBackground={() => (
        <View style={{ width: "100%", height: headerHeight }}>
          <BlurView style={{ height: insets.top }} intensity={30} />
          <Animated.View style={[StyleSheet.absoluteFill, headerOpacity]}>
            <BlurView style={StyleSheet.absoluteFill} intensity={30} />
          </Animated.View>
        </View>
      )}
    />
  )

  const onPurchase = async () => {
    try {
      setPurchaseInProgress(true)
    } catch (error) {
      Burnt.alert({ title: "Something went wrong", preset: "error" })
    } finally {
      setPurchaseInProgress(false)
    }
  }

  return (
    <Screen style={{ flex: 1, backgroundColor: color.background }}>
      <Stack.Screen options={{ header: customHeader }} />
      <Animated.ScrollView
        onScroll={scrollHandler}
        style={{ height: "100%" }}
        scrollEventThrottle={1}
        contentContainerStyle={{ paddingTop: 10 + insets.top, paddingBottom: 120 + insets.bottom }}
      >
        <View style={HEAD_WRAPPER}>
          <View style={{ width: 200, height: 200, backgroundColor: "grey", borderRadius: 8, marginBottom: 24 }} />
          <Text style={BETTER_RAIL_PRO_TITLE}>Better Rail Pro</Text>
          <Text tx="paywall.intro" style={[BETTER_RAIL_PRO_SUBTITLE, { paddingHorizontal: spacing[6] }]} />
        </View>

        <View style={{ gap: 18 }}>
          <FeaturesBox />

          <View>
            <Text
              tx="paywall.tryFree"
              style={[BETTER_RAIL_PRO_SUBTITLE, { fontSize: 20, fontWeight: "500", marginBottom: -2 }]}
            />
            <Text tx="paywall.afterTrial" style={BETTER_RAIL_PRO_SUBTITLE} />
          </View>

          <SubscriptionTypeBox value={subscriptionType} onChange={setSubscriptionType} />
        </View>
      </Animated.ScrollView>

      <SubscribeButtonSheet subscriptionType={subscriptionType} onPress={onPurchase} isLoading={purchaseInProgres} />
    </Screen>
  )
}
