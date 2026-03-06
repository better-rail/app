import { Image, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { fontScale, spacing } from "../../theme"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
}

export function ZollyAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()

  const handleDone = () => {
    navigation.getParent()?.navigate("mainStack", { screen: "planner" })
  }

  return (
    <Screen preset="scroll">
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          paddingTop: insets.top + spacing[4],
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[5] * fontScale,
        }}
      >
        <View style={{ marginBottom: spacing[6], alignItems: "center" }}>
          <Image
            source={require("../../../assets/zolly.png")}
            style={{ height: 80, width: 200, resizeMode: "contain", marginBottom: spacing[3] }}
          />
          <Text text="Coming soon" style={TEXT} />
        </View>

        <View style={{ flex: 1 }} />

        <Button title="Done" onPress={handleDone} />
      </ScrollView>
    </Screen>
  )
}
