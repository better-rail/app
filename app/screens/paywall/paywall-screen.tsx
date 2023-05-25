import { Dimensions, Platform, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { ScrollView } from "react-native-gesture-handler"
import { useLayoutEffect, useState } from "react"
import { SubscriptionTypeBox, SubscriptionTypes } from "./subscription-type-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { PaywallScreenProps } from "../../navigators/paywall/paywall-navigator"
import { SubscribeButtonSheet } from "./subscribe-button-sheet"
import { FeaturesBox } from "./paywall-features-box"
import CloseButton from "../../components/close-button/close-button"
import { translate } from "../../i18n"
import { BlurView } from "@react-native-community/blur"
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated"
import { Header, HeaderBackButton, HeaderTitle } from "@react-navigation/elements"

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
  letterSpacing: -0.5,
  paddingHorizontal: 24,
}

// #endregion

export function PaywallScreen({ navigation }: PaywallScreenProps) {
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionTypes>("annual")
  const insets = useSafeAreaInsets()
  const scrollPosition = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollPosition.value = event.contentOffset.y
  })

  const inputRange = [0, 210 + insets.top, 220 + insets.top]

  const headerOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(scrollPosition.value, inputRange, [0, 0, 1], Extrapolate.CLAMP)

    return { opacity }
  })

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => {
        return (
          <Header
            title="Better Rail Pro"
            headerLeft={(props) => <HeaderBackButton {...props} label="Hello" onPress={() => navigation.goBack()} />}
            // headerTransparent={true}
            headerTitle={(props) => (
              <Animated.Text style={[{ fontSize: 17, fontWeight: 600 }, headerOpacity]}>Better Rail Pro</Animated.Text>
            )}
            headerBackground={() => (
              <View style={{ width: "100%", height: 70 }}>
                <BlurView style={{ height: insets.top }} blurType="regular" blurAmount={30} />
                <Animated.View style={[StyleSheet.absoluteFillObject, headerOpacity]}>
                  <BlurView style={StyleSheet.absoluteFillObject} blurType="regular" blurAmount={30} />
                </Animated.View>
              </View>
            )}
          />
        )
      },
    })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      {/* <View style={{ position: "absolute", top: 0, zIndex: 100, width: "100%", opacity: 1 }}>
        <CloseButton
          onPress={() => navigation.goBack()}
          style={{ marginTop: insets.top - 10, marginStart: 6 }}
          iconStyle={{ tintColor: "grey" }}
          accessibilityLabel={translate("common.close")}
        />
      </View> */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        style={{ height: "100%" }}
        scrollEventThrottle={1}
        contentContainerStyle={{ paddingTop: 10 + insets.top, paddingBottom: 120 + insets.bottom }}
      >
        <View style={HEAD_WRAPPER}>
          <View style={{ width: 200, height: 200, backgroundColor: "grey", borderRadius: 8, marginBottom: 24 }} />
          <Text style={BETTER_RAIL_PRO_TITLE}>Better Rail Pro</Text>
          <Text
            tx="paywall.intro"
            style={[BETTER_RAIL_PRO_SUBTITLE, { paddingHorizontal: spacing[6], marginBottom: spacing[4] }]}
          />
          <Text tx="paywall.tryFree" style={[BETTER_RAIL_PRO_SUBTITLE, { fontWeight: "500", marginBottom: -4 }]} />
          <Text tx="paywall.afterTrial" style={BETTER_RAIL_PRO_SUBTITLE} />
        </View>

        <View style={{ gap: 24 }}>
          <SubscriptionTypeBox value={subscriptionType} onChange={setSubscriptionType} />
          <FeaturesBox />
        </View>
      </Animated.ScrollView>

      <SubscribeButtonSheet subscriptionType={subscriptionType} />
    </View>
  )
}
