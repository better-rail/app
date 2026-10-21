import { useMemo } from "react"
import { RefreshControl, ScrollView } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { useShallow } from "zustand/react/shallow"
import { trackEvent } from "@/services/analytics"
import { useFavoritesStore, useRoutePlanStore } from "@/models"
import { LineList } from "./components/line-list"
import { userLineIds, userRoutes } from "./user-lines"
import { useServiceStatus } from "./use-service-status"

/**
 * Every line's status, as a plain list: the rider's own lines (the route being planned, the
 * favourites) first, then what is wrong elsewhere, then the rest. Tap a line for its details.
 */
export function ServiceStatusScreen() {
  const router = useRouter()
  const { origin, destination } = useRoutePlanStore(useShallow((s) => ({ origin: s.origin, destination: s.destination })))
  const favorites = useFavoritesStore((s) => s.routes)
  const myLines = useMemo(
    () => userLineIds(userRoutes({ origin, destination }, favorites)),
    // The stations, not the station objects: the plan store makes new ones on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin?.id, destination?.id, favorites],
  )
  const { refetch, isRefetching, data } = useServiceStatus()

  const selectLine = (lineId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_line_pressed", { lineId, source: "list" })
    router.push({ pathname: "/service-status/line", params: { lineId } })
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      // A pull refreshes once the first load is in; before that the list shows its own spinner.
      refreshControl={
        data ? (
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch()
            }}
          />
        ) : undefined
      }
      testID="service-status-screen"
    >
      <LineList userLineIds={myLines} onSelectLine={selectLine} />
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.secondaryBackground,
  },
  content: {
    flexGrow: 1,
    paddingBottom: rt.insets.bottom + theme.spacing[5],
  },
}))
