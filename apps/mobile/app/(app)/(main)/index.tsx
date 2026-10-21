import { Stack } from "expo-router"
import { useSplitLayout } from "@/hooks/use-split-layout"
import { PlannerScreen } from "@/screens/planner/planner-screen"
import { SplitRouteListScreen } from "@/screens/route-list/split-route-list-screen"

export default function HomeScreen() {
  const isSplitLayout = useSplitLayout()
  // The planner moves to the split view's sidebar, so this column lists its trains
  if (isSplitLayout) return <SplitRouteListScreen />

  return (
    <>
      {/* The route list shows a native header here in the split layout; folding back drops it */}
      <Stack.Screen options={{ headerShown: false }} />
      <PlannerScreen />
    </>
  )
}
