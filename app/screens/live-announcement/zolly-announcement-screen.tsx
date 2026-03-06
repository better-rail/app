import { Image, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { fontScale, spacing } from "../../theme"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: "white",
}

export function ZollyAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()

  const handleDone = () => {
    navigation.getParent()?.navigate("mainStack", { screen: "planner" })
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        paddingTop: insets.top + spacing[4],
        paddingHorizontal: spacing[5],
        paddingBottom: spacing[5] * fontScale,
        backgroundColor: "#116012",
      }}
    >
      <View style={{ marginBottom: spacing[3], alignItems: "center" }}>
        <Text text="חדש מבטר רייל" style={TEXT} />
        <Image
          source={require("../../../assets/zolly.png")}
          tintColor="#def49e"
          style={{ height: 200, width: 200, resizeMode: "contain" }}
        />
      </View>

      <Text>יצרנו אפליקצייה חדשה</Text>

      <View style={{ flex: 1 }} />

      <Button title="Done" onPress={handleDone} />
    </ScrollView>
  )
}
