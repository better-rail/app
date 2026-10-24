import { Stack } from "expo-router"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { Screen, Text } from "@/components"
import { useRoutePlanStore } from "@/models"
import { RouteListResults } from "./route-list-screen"

/** The split layout's home screen: trains for the stations picked in the planner sidebar. */
export function SplitRouteListScreen() {
  const { origin, destination, date } = useRoutePlanStore(
    useShallow((s) => ({ origin: s.origin, destination: s.destination, date: s.date })),
  )

  if (!origin || !destination || origin.id === destination.id) {
    return (
      <Screen style={styles.placeholder}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text
          tx={origin && origin.id === destination?.id ? "routes.sameStationsMessage" : "routes.chooseStationsMessage"}
          style={styles.placeholderText}
        />
      </Screen>
    )
  }

  return (
    <RouteListResults
      key={`${origin.id}-${destination.id}-${date.getTime()}`}
      originId={origin.id}
      destinationId={destination.id}
      time={date.getTime()}
      enableQuery
    />
  )
}

const styles = StyleSheet.create((theme) => ({
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing[5],
  },
  placeholderText: {
    textAlign: "center",
    opacity: 0.6,
  },
}))
