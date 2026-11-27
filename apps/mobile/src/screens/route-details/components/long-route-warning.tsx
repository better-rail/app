import { Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { formatTime } from "@/utils/helpers/date-helpers"

export const LongRouteWarning = () => (
  <View style={styles.wrapper}>
    <Text style={{ fontSize: 48 }}>🕰</Text>
    <Text style={styles.title} tx="routeDetails.routeWarning" />
    <Text style={styles.text} tx="routeDetails.routeWarningText" />
  </View>
)

// A later train gets there sooner, so name it: the rider can wait for it instead
export const OvertakenWarning = ({
  departureTime,
  arrivalTime,
  onPress,
}: {
  departureTime: number
  arrivalTime: number
  onPress: () => void
}) => (
  <View style={styles.wrapper}>
    <Text style={{ fontSize: 48 }}>⏳</Text>
    <Text style={styles.title} tx="routeDetails.overtakenWarning" />
    <Text
      style={styles.text}
      tx="routeDetails.overtakenWarningText"
      txOptions={{ departure: formatTime(departureTime), arrival: formatTime(arrivalTime) }}
    />
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
      testID="open-overtaking-route"
    >
      <Text style={styles.linkText} tx="routeDetails.overtakenWarningLink" txOptions={{ departure: formatTime(departureTime) }} />
    </Pressable>
  </View>
)

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing[4],
    backgroundColor: theme.colors.secondary,
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  text: {
    paddingHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[3],
    textAlign: "center",
  },
  link: {
    marginTop: -theme.spacing[1],
    marginBottom: theme.spacing[3],
  },
  linkText: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
}))
