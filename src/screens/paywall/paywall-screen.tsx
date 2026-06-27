import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, CloseButton } from "@/components"
import { color } from "@/theme"
import { useState } from "react"
import { SubscriptionTypeBox, SubscriptionTypes } from "./subscription-type-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SubscribeButtonSheet } from "./subscribe-button-sheet"
import { FeaturesBox } from "./paywall-features-box"
import { translate } from "@/i18n"
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
        <Animated.Text style={[styles.headerTitleText, headerOpacity]}>
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
    <Screen style={styles.screen}>
      <Stack.Screen options={{ header: customHeader }} />
      <Animated.ScrollView
        onScroll={scrollHandler}
        style={styles.scrollView}
        scrollEventThrottle={1}
        contentContainerStyle={{ paddingTop: 10 + insets.top, paddingBottom: 120 + insets.bottom }}
      >
        <View style={styles.headWrapper}>
          <View style={styles.placeholder} />
          <Text style={styles.betterRailProTitle}>Better Rail Pro</Text>
          <Text tx="paywall.intro" style={[styles.betterRailProSubtitle, styles.introSubtitle]} />
        </View>

        <View style={styles.featuresWrapper}>
          <FeaturesBox />

          <View>
            <Text
              tx="paywall.tryFree"
              style={[styles.betterRailProSubtitle, styles.tryFreeSubtitle]}
            />
            <Text tx="paywall.afterTrial" style={styles.betterRailProSubtitle} />
          </View>

          <SubscriptionTypeBox value={subscriptionType} onChange={setSubscriptionType} />
        </View>
      </Animated.ScrollView>

      <SubscribeButtonSheet subscriptionType={subscriptionType} onPress={onPurchase} isLoading={purchaseInProgres} />
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    height: "100%",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: 600,
    color: theme.colors.text,
  },
  headWrapper: {
    alignItems: "center",
    marginBottom: theme.spacing[5],
  },
  placeholder: {
    width: 200,
    height: 200,
    backgroundColor: "grey",
    borderRadius: 8,
    marginBottom: 24,
  },
  betterRailProTitle: {
    marginBottom: theme.spacing[0],
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "System",
    letterSpacing: -0.85,
  },
  betterRailProSubtitle: {
    textAlign: "center",
    letterSpacing: -0.4,
    paddingHorizontal: 24,
    fontSize: rt.rtl ? 18 : 16,
  },
  introSubtitle: {
    paddingHorizontal: theme.spacing[6],
  },
  featuresWrapper: {
    gap: 18,
  },
  tryFreeSubtitle: {
    fontSize: 20,
    fontWeight: "500",
    marginBottom: -2,
  },
}))
