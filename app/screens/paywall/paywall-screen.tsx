import { Platform, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
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

// #region styles
const HEAD_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginBottom: spacing[4],
}

const BETTER_RAIL_PRO_TITLE: TextStyle = {
  marginBottom: spacing[0],
  textAlign: "center",
  fontSize: 28,
  fontWeight: "600",
  letterSpacing: -0.9,
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

  // useLayoutEffect(() => {
  //   navigation.setOptions({
  //     headerStatusBarHeight: insets.top + 10,
  //   })
  // }, [])

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      {/* <View style={{ position: "absolute", top: 0, zIndex: 100, width: "100%", opacity: 1 }}> */}
      {/* <CloseButton
        onPress={() => navigation.goBack()}
        style={{ marginTop: insets.top - 10, marginStart: 6 }}
        iconStyle={{ tintColor: "grey" }}
        accessibilityLabel={translate("common.close")}
      /> */}
      {/* <BlurView style={{ ...StyleSheet.absoluteFillObject, zIndex: -1 }} blurType="dark" />
      </View> */}
      <ScrollView
        style={{ height: "100%" }}
        contentContainerStyle={{ paddingTop: 45 + insets.top, paddingBottom: 120 + insets.bottom }}
      >
        <View style={HEAD_WRAPPER}>
          <View style={{ width: 200, height: 200, backgroundColor: "grey", borderRadius: 8, marginBottom: 24 }} />
          <Text style={BETTER_RAIL_PRO_TITLE}>Better Rail Pro</Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { paddingHorizontal: spacing[6], marginBottom: spacing[4] }]}>
            Supercharge your train travels and support the app development.
          </Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { fontWeight: "500", marginBottom: -4 }]}>Try free for 14 days.</Text>
          <Text style={BETTER_RAIL_PRO_SUBTITLE}>Afterwards, it’s less than a cup of coffee ☕️</Text>
        </View>

        <View style={{ gap: 16 }}>
          <SubscriptionTypeBox value={subscriptionType} onChange={setSubscriptionType} />
          <FeaturesBox />
        </View>
      </ScrollView>

      <SubscribeButtonSheet subscriptionType={subscriptionType} />
    </View>
  )
}
