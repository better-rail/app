import { Dimensions, DynamicColorIOS, Image, ImageStyle, Platform, View, ViewStyle } from "react-native"
import { List, ListItem } from "../../components"
import { CHEVRON_ICON } from "../settings"
import { translate } from "../../i18n"

const deviceWidth = Dimensions.get("screen").width
const isLargeScreen = deviceWidth > 375

const LiveActivityIcon = require("../../../assets/live-activity.png")
const WidgetsIcon = require("../../../assets/widgets.png")
const AppleWatchIcon = require("../../../assets/applewatch.png")
const GiftIcon = require("../../../assets/gift.ios.png")
const HumansIcon = require("../../../assets/humans.ios.png")
const ChevronIcon = require("../../../assets/chevron.png")

const colors = Platform.OS === "ios" && {
  orange: {
    background: DynamicColorIOS({ light: "#FFE8C5", dark: "#4E2F00" }),
    foreground: DynamicColorIOS({ light: "#f3a31c", dark: "#E7AC52" }),
  },
  blue: {
    background: DynamicColorIOS({ light: "#D6EAFF", dark: "#013E80" }),
    foreground: DynamicColorIOS({ light: "#007AFF", dark: "#6CB2FF" }),
  },
  green: {
    background: DynamicColorIOS({ light: "#E2FFD2", dark: "#2B5409" }),
    foreground: DynamicColorIOS({ light: "#3B6C12", dark: "#73D025" }),
  },
  red: {
    background: DynamicColorIOS({ light: "#FFE8E7", dark: "#5D0500" }),
    foreground: DynamicColorIOS({ light: "#FF3B30", dark: "#FE4F46" }),
  },
  purple: {
    background: DynamicColorIOS({ light: "#FFE7F9", dark: "#53007C" }),
    foreground: DynamicColorIOS({ light: "#AF52DE", dark: "#C98BE9" }),
  },
}

export function FeaturesBox() {
  return (
    <List>
      <FeatureBox
        title={translate("paywall.liveActivity")}
        subtitle={translate("paywall.liveActivityDetail")}
        icon={LiveActivityIcon}
        bgColor={colors.orange.background}
        iconColor={colors.orange.foreground}
      />
      <FeatureBox
        title={translate("paywall.widgets")}
        subtitle={translate("paywall.widgetsDetail")}
        icon={WidgetsIcon}
        bgColor={colors.blue.background}
        iconColor={colors.blue.foreground}
      />
      <FeatureBox
        title={translate("paywall.appleWatchApp")}
        subtitle={translate("paywall.appleWatchAppDetail")}
        icon={AppleWatchIcon}
        bgColor={colors.green.background}
        iconColor={colors.green.foreground}
      />
      <FeatureBox
        title={translate("paywall.appIcons")}
        subtitle={translate("paywall.appIconsDetail")}
        icon={GiftIcon}
        bgColor={colors.red.background}
        iconColor={colors.red.foreground}
      />
      <FeatureBox
        title={translate("paywall.supportProject")}
        subtitle={translate("paywall.supportProjectDetail")}
        icon={HumansIcon}
        bgColor={colors.purple.background}
        iconColor={colors.purple.foreground}
      />
    </List>
  )
}

const FeatureBox = ({ title, subtitle, icon, bgColor, iconColor, ...rest }) => (
  <ListItem
    title={title}
    subtitle={subtitle}
    contentStyle={{ width: isLargeScreen ? 230 : 220 }}
    startBoxItem={<FeatureBoxIcon icon={icon} backgroundColor={bgColor} tintColor={iconColor} />}
    endBoxItem={<Image source={ChevronIcon} style={[CHEVRON_ICON, { marginStart: 0, marginEnd: 0 }]} />}
    onPress={() => {}}
    {...rest}
  />
)

const ICON_BOX_WRAPPER: ViewStyle = {
  width: 40,
  height: 40,
  marginTop: -12,
  marginStart: -8,
  marginEnd: 12,
  padding: 18,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
}

const ICON_STYLE: ImageStyle = {
  height: 25,
  resizeMode: "contain",
  tintColor: "white",
}

const FeatureBoxIcon = ({ icon, backgroundColor, tintColor }) => (
  <View style={[ICON_BOX_WRAPPER, { backgroundColor }]}>
    <Image source={icon} style={[ICON_STYLE, { tintColor }]} />
  </View>
)
