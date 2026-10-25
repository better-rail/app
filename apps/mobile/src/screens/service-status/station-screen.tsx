import { useMemo, useRef } from "react"
import { ScrollView, type ScrollViewInstance, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useLocalSearchParams, useRouter } from "expo-router"
import { getStationById } from "@/data/stations"
import { StationDetails, type StationSection } from "./components/station-details"
import { StationHeader, type StationTile } from "./components/station-header"
import { dayTypeForStation } from "./day-type"

/**
 * A station's card, on a sheet, like a place card in Apple Maps: its photo with its name and how
 * it is doing over it, then what is wrong there and its entrances with their hours. Opened from a
 * station on a route and from a line's stations.
 */
export function StationScreen() {
  const { stationId } = useLocalSearchParams<{ stationId?: string }>()
  const router = useRouter()
  const scroll = useRef<ScrollViewInstance>(null)
  // Where the card's sections sit (from the top of the sheet), for the pills and bell in the header.
  const sectionTops = useRef<Partial<Record<StationSection, number>>>({})
  const detailsTop = useRef(0)
  // The timetable the station's status is worked out from: today's, unless no line calls today.
  const dayType = useMemo(() => (stationId ? dayTypeForStation(stationId) : undefined), [stationId])

  if (!stationId || !dayType || !getStationById(stationId)) return null

  const showSection = (section: StationSection) => {
    const top = sectionTops.current[section]
    if (top !== undefined) scroll.current?.scrollTo({ y: top, animated: true })
  }

  /** The status pill goes to what is wrong at the station, when anything is; the open pill to its entrances. */
  const showTile = (tile: StationTile) => showSection(tile === "open" ? "entrances" : "disruptions")

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
