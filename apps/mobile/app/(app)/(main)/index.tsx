import { Platform, useColorScheme } from "react-native"
import { Stack } from "expo-router"
import { useUnistyles } from "react-native-unistyles"
import { useSplitLayout } from "@/hooks/use-split-layout"
import { PlannerScreen } from "@/screens/planner/planner-screen"
import { SplitRouteListScreen } from "@/screens/route-list/split-route-list-screen"

export default function HomeScreen() {
  const isSplitLayout = useSplitLayout()
  const colorScheme = useColorScheme()
  const { theme } = useUnistyles()
  // The planner moves to the split view's sidebar, so this column lists its trains
  if (isSplitLayout) return <SplitRouteListScreen />

  return (
    <>
      {/* The route list sets its own header here in the split layout; folding back restores this one */}
      <Stack.Screen
        options={
          Platform.OS === "ios"
            ? {
                headerShown: true,
                // Opaque, so the planner doesn't scroll under the bar and get a hard edge effect behind its glassless items
                headerStyle: { backgroundColor: theme.colors.background as string },
                headerShadowVisible: false,
                // The stack's theme forces dark glass for the route list's photo header
                headerUserInterfaceStyle: colorScheme === "dark" ? "dark" : "light",
              }
            : { headerShown: false }
        }
      />
      <PlannerScreen />
    </>
  )
}
