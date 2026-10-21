import { useMemo, useRef } from "react"
import { ScrollView, type ScrollViewInstance, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useLocalSearchParams, useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { trackEvent } from "@/services/analytics"
import { getStationById } from "@/data/stations"
import { useRoutePlanStore } from "@/models"
import { StationDetails, type StationSection } from "./components/station-details"
import { StationHeader, type StationTile } from "./components/station-header"
import { dayTypeForStation } from "./day-type"

/**
 * A station's card, on a sheet, like a place card in Apple Maps: its photo with its name and how
 * it is doing over it, then what is wrong there, the next trains on each line calling, and its
 * entrances with their hours. Opened from a station on a route and from a line's stations.
 */
export function StationScreen() {
  const { stationId } = useLocalSearchParams<{ stationId?: string }>()
  const router = useRouter()
  const scroll = useRef<ScrollViewInstance>(null)
  // Where the card's sections sit (from the top of the sheet), for the pills and bell in the header.
  const sectionTops = useRef<Partial<Record<StationSection, number>>>({})
  const detailsTop = useRef(0)
  // The timetable the station's lines are listed from: today's, unless no line calls today.
  const dayType = useMemo(() => (stationId ? dayTypeForStation(stationId) : undefined), [stationId])

  if (!stationId || !dayType || !getStationById(stationId)) return null

  const showSection = (section: StationSection) => {
    const top = sectionTops.current[section]
    if (top !== undefined) scroll.current?.scrollTo({ y: top, animated: true })
  }

  /** The status pill goes to what is wrong at the station when anything is, else to its lines; the open pill to its entrances. */
  const showTile = (tile: StationTile) => {
    if (tile === "open") return showSection("entrances")
    showSection(sectionTops.current.disruptions !== undefined ? "disruptions" : "lines")
  }

  const selectLine = (lineId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("service_status_line_pressed", { lineId, source: "station" })
    router.push({ pathname: "/service-status/line", params: { lineId } })
  }

  /** "Trip plan": the planner, with the station as the destination and the time now. */
  const goNow = () => {
    const station = getStationById(stationId)
    if (!station) return
    HapticFeedback.trigger("impactMedium")
    trackEvent("service_status_go_now_pressed", { stationId })
    const plan = useRoutePlanStore.getState()
    plan.setDestination({ id: station.id, name: station.name })
    plan.setDate(new Date())
    router.dismissTo("/")
  }

  return (
    <ScrollView
      ref={scroll}
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="station-sheet"
    >
      <StationHeader
        stationId={stationId}
        dayType={dayType}
        onClose={() => router.back()}
        onShowAlerts={() => showSection("alerts")}
        onShowSection={showTile}
      />
      <View
        style={styles.details}
        onLayout={(e) => {
          detailsTop.current = e.nativeEvent.layout.y
        }}
      >
        <StationDetails
          stationId={stationId}
          dayType={dayType}
          onSelectLine={selectLine}
          onGoNow={goNow}
          onSectionLayout={(section, y) => {
            sectionTops.current[section] = detailsTop.current + y
          }}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: rt.insets.bottom + theme.spacing[5],
  },
  details: {
    padding: theme.spacing[4],
  },
}))
