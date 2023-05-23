import { TextStyle, View, ViewStyle } from "react-native"
import { Text, List, ListItem } from "../../components"
import { color, spacing } from "../../theme"
import { BlurView } from "@react-native-community/blur"
import { ScrollView } from "react-native-gesture-handler"
import BouncyCheckbox from "react-native-bouncy-checkbox"

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

export function PaywallScreen() {
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
            title="Annual"
            subtitle={
              <View style={{ flexDirection: "row", gap: 3 }}>
                <Text style={{ color: color.dim, textDecorationLine: "line-through" }}>₪82.90</Text>
                <Text style={{ color: color.dim }}>₪59.90/year</Text>
              </View>
            }
            startBoxItem={
              <BouncyCheckbox onPress={(isChecked: boolean) => {}} fillColor={color.secondary} bounceEffectIn={0.9} />
            }
          />
          <ListItem
            title="Monthly"
            startBoxItem={
              <BouncyCheckbox onPress={(isChecked: boolean) => {}} fillColor={color.secondary} bounceEffectIn={0.9} />
            }
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
