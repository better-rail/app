import { OpaqueColorValue, TextStyle, View, ViewStyle } from "react-native"
import { Text, List, ListItem } from "../../components"
import { color } from "../../theme"
import BouncyCheckbox from "react-native-bouncy-checkbox"
import { useIsDarkMode } from "../../hooks/use-is-dark-mode"
import { translate } from "../../i18n"

export type SubscriptionTypes = "annual" | "monthly"

const ANNUAL_ITEM_TITLE_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 2,
}

const ANNUAL_ITEM_TITLE: TextStyle = {
  fontSize: 18,
}

const ITEM_SUBTITLE: TextStyle = {
  fontSize: 14,
  color: color.dim,
}

const SUBSCRIPTION_PRICE: TextStyle = {
  color: color.grey,
  fontSize: 18,
}

interface SubscriptionTypeBoxProps {
  value: SubscriptionTypes
  onChange: (value: SubscriptionTypes) => void
}

export function SubscriptionTypeBox({ value, onChange }: SubscriptionTypeBoxProps) {
  const isDarkMode = useIsDarkMode()

  // the secondary light mode variant (aka pinky) looks bad here, so we override here with primary
  // and leave the purple dark mode color in place
  const fillColor = isDarkMode ? color.secondary : color.primary

  return (
    <List>
      <ListItem
        title={
          <View style={ANNUAL_ITEM_TITLE_WRAPPER}>
            <Text tx="paywall.annual" style={ANNUAL_ITEM_TITLE} />
            <DiscountBadge value={30} backgroundColor={fillColor} />
          </View>
        }
        subtitle={
          <View style={{ flexDirection: "row", gap: 3 }}>
            <Text style={[ITEM_SUBTITLE, { textDecorationLine: "line-through" }]}>₪82.90</Text>
            <Text style={ITEM_SUBTITLE}>₪59.90/year</Text>
          </View>
        }
        onPress={() => onChange("annual")}
        startBoxItem={<BouncyCheckbox disableBuiltInState isChecked={value === "annual"} fillColor={fillColor} />}
        endBoxItem={<Text style={SUBSCRIPTION_PRICE}>₪4.90/month</Text>}
      />
      <ListItem
        title={translate("paywall.monthly")}
        onPress={() => onChange("monthly")}
        startBoxItem={<BouncyCheckbox disableBuiltInState isChecked={value === "monthly"} fillColor={fillColor} />}
        endBoxItem={<Text style={SUBSCRIPTION_PRICE}>₪6.90/month</Text>}
      />
    </List>
  )
}

const DISCOUNT_BADGE_WRAPPER: ViewStyle = {
  borderRadius: 4,
  paddingHorizontal: 3,
  paddingVertical: 2,
  marginBottom: 1,
}

const DISCOUNT_BADGE_TEXT: TextStyle = {
  fontSize: 14,
  fontFamily: "System",
  fontWeight: "bold",
  letterSpacing: -0.5,
  color: color.whiteText,
}

const DiscountBadge = ({ value, backgroundColor }: { value: number; backgroundColor: string | OpaqueColorValue }) => {
  return (
    <View style={[DISCOUNT_BADGE_WRAPPER, { backgroundColor: backgroundColor }]}>
      <Text style={DISCOUNT_BADGE_TEXT}>-{value}%</Text>
    </View>
  )
}
