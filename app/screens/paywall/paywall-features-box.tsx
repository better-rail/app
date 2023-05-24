import { Image, ImageStyle, View, ViewStyle } from "react-native"
import { List, ListItem } from "../../components"
import { CHEVRON_ICON } from "../settings"

const LiveActivityIcon = require("../../../assets/live-activity.png")
const WidgetsIcon = require("../../../assets/widgets.png")
const ChevronIcon = require("../../../assets/chevron.png")

export function FeaturesBox() {
  return (
    <List>
      <ListItem title="Live Activities"
        subtitle="Real-Time train updates on your lock screen."
        contentStyle={{ marginEnd: 70 }}
        startBoxItem={<FeatureBoxIcon icon={LiveActivityIcon} backgroundColor="orange" />}
        endBoxItem={<Image source={ChevronIcon} style={[CHEVRON_ICON, { marginStart: -20 }]} />}
        onPress={() => { }}
      />
      <ListItem title="Widgets" subtitle="View your train schedule at a glance with our homescreen widget." startBoxItem={<FeatureBoxIcon icon={WidgetsIcon} backgroundColor="#E26850" />} />
    </List>
  )
}

const ICON_BOX_WRAPPER: ViewStyle = {
  width: 30,
  height: 30,
  marginTop: -20,
  marginStart: -5,
  marginEnd: 12,
  padding: 18,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
}

const ICON_STYLE: ImageStyle = {
  height: 21,
  resizeMode: "contain",
  tintColor: "white"
}

const FeatureBoxIcon = ({ icon, backgroundColor }) => (
  <View style={[ICON_BOX_WRAPPER, { backgroundColor }]}>
    <Image source={icon} style={ICON_STYLE} />
  </View>
)
