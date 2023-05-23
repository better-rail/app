import { TextStyle, View, ViewStyle, useColorScheme } from "react-native"
import { Text, List, ListItem } from "../../components"
import { color, spacing } from "../../theme"
import { BlurView } from "@react-native-community/blur"
import { ScrollView } from "react-native-gesture-handler"
import BouncyCheckbox from "react-native-bouncy-checkbox"
import { useState } from "react"

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
  backgroundColor: color.secondaryBackground,
  width: "100%",
  height: 80,
}

type SubscriptionTypes = "annual" | "monthly"

export function PaywallScreen() {
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionTypes>("annual")

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"
  // the secondary light mode variant (aka pinky) looks bad here, so we override here with primary
  // and leave the purple dark mode color in place
  const fillColor = isDarkMode ? color.secondary : color.primary

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ height: "100%" }} contentContainerStyle={{ paddingTop: 48 }}>
        <View style={HEAD_WRAPPER}>
          <View style={{ width: 200, height: 200, backgroundColor: "grey", borderRadius: 8, marginBottom: 24 }} />
          <Text style={BETTER_RAIL_PRO_TITLE}>Better Rail Pro</Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { marginBottom: spacing[4] }]}>Supercharge your train travels.</Text>
          <Text style={[BETTER_RAIL_PRO_SUBTITLE, { fontWeight: "500" }]}>Try free for 14 days.</Text>
          <Text style={BETTER_RAIL_PRO_SUBTITLE}>Afterwards, it’s less than a cup of coffee.</Text>
        </View>

        <List>
          <ListItem
            title={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <Text style={{ fontSize: 18 }}>Annual</Text>
                <View
                  style={{
                    backgroundColor: fillColor,
                    borderRadius: 4,
                    paddingHorizontal: 3,
                    paddingVertical: 2,
                    marginBottom: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      letterSpacing: -0.5,
                      fontFamily: "System",
                      color: color.whiteText,
                    }}
                  >
                    -30%
                  </Text>
                </View>
              </View>
            }
            subtitle={
              <View style={{ flexDirection: "row", gap: 3 }}>
                <Text style={{ fontSize: 14, color: color.dim, textDecorationLine: "line-through" }}>₪82.90</Text>
                <Text style={{ fontSize: 14, color: color.dim }}>₪59.90/year</Text>
              </View>
            }
            onPress={() => setSubscriptionType("annual")}
            startBoxItem={
              // @ts-expect-error color value
              <BouncyCheckbox disableBuiltInState isChecked={subscriptionType === "annual"} fillColor={fillColor} />
            }
            endBoxItem={<Text style={{ color: color.grey, fontSize: 18 }}>₪4.90/month</Text>}
          />
          <ListItem
            title="Monthly"
            onPress={() => setSubscriptionType("monthly")}
            startBoxItem={
              // @ts-expect-error color value
              <BouncyCheckbox disableBuiltInState isChecked={subscriptionType === "monthly"} fillColor={fillColor} />
            }
            endBoxItem={<Text style={{ color: color.grey, fontSize: 18 }}>₪6.90/month</Text>}
          />
        </List>
      </ScrollView>
      <View style={BOTTOM_FLOATING_VIEW}>
        <Text>hi</Text>
        <BlurView blurType="regular" style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }} />
      </View>
    </View>
  )
}
