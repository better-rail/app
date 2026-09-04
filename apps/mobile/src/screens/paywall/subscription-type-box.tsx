import { OpaqueColorValue, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text, List, ListItem } from "@/components"
import { color } from "@/theme"
import BouncyCheckbox from "react-native-bouncy-checkbox"
import { useIsDarkMode } from "@/hooks/use-is-dark-mode"
import { translate } from "@/i18n"

export type SubscriptionTypes = "annual" | "monthly"

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
          <View style={styles.annualItemTitleWrapper}>
            <Text tx="paywall.annual" style={styles.annualItemTitle} />
            <DiscountBadge value={30} backgroundColor={fillColor} />
          </View>
        }
        subtitle={
          <View style={styles.subtitleRow}>
            <Text style={[styles.itemSubtitle, { textDecorationLine: "line-through" }]}>₪82.90</Text>
            <Text style={styles.itemSubtitle}>{translate("paywall.yearlyPrice", { price: "59.90₪" })}</Text>
          </View>
        }
        onPress={() => onChange("annual")}
        startBoxItem={<BouncyCheckbox disableBuiltInState isChecked={value === "annual"} fillColor={fillColor} />}
        endBoxItem={<Text style={styles.subscriptionPrice}>{translate("paywall.monthlyPrice", { price: "4.90₪" })}</Text>}
      />
      <ListItem
        title={translate("paywall.monthly")}
        onPress={() => onChange("monthly")}
        startBoxItem={<BouncyCheckbox disableBuiltInState isChecked={value === "monthly"} fillColor={fillColor} />}
        endBoxItem={<Text style={styles.subscriptionPrice}>{translate("paywall.monthlyPrice", { price: "6.90₪" })}</Text>}
      />
    </List>
  )
}

const DiscountBadge = ({ value, backgroundColor }: { value: number; backgroundColor: string | OpaqueColorValue }) => {
  return (
    <View style={[styles.discountBadgeWrapper, { backgroundColor: backgroundColor }]}>
      <Text style={styles.discountBadgeText}>-{value}%</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  annualItemTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  annualItemTitle: {
    fontSize: 18,
  },
  subtitleRow: {
    flexDirection: "row",
    gap: 3,
  },
  itemSubtitle: {
    fontSize: 14,
    color: theme.colors.dim,
  },
  subscriptionPrice: {
    color: theme.colors.grey,
    fontSize: 18,
  },
  discountBadgeWrapper: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginBottom: 1,
  },
  discountBadgeText: {
    fontSize: 14,
    fontFamily: "System",
    fontWeight: "bold",
    letterSpacing: -0.5,
    color: theme.colors.whiteText,
  },
}))
