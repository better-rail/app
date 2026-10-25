import { useState } from "react"
import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { RAIL_MAP_EXIT_INSET, RailMap, railMapSectionHeight } from "@/components/rail-map"
import { translate } from "@/i18n"
import { stationName } from "@/data/stations"
import { getRailLine } from "@/data/rail-lines"
import type { Disruption } from "@/services/api"
import { dayTypeForLine } from "../day-type"

/** The picture's height bounds: a short stretch still gets its names, a long one stays a picture on a card. */
const MAP_HEIGHT = { min: 170, max: 560 }

/** The big cities an arrow off the picture names, by their stations. */
const CITY_STATIONS: Record<string, "telAviv" | "haifa" | "jerusalem" | "beerSheva"> = {
  "3600": "telAviv",
  "3700": "telAviv",
  "4600": "telAviv",
  "4900": "telAviv",
  "2100": "haifa",
  "2200": "haifa",
  "2300": "haifa",
  "680": "jerusalem",
  "7300": "beerSheva",
  "7320": "beerSheva",
}

/** End stations of the network an arrow names by their own name: Nahariya, Karmiel, Ashkelon. */
const END_STATIONS = new Set(["1600", "1840", "5900"])

/**
 * Where the line goes past the picture: the nearest big city or end station along it, else where the
 * line ends. A city already in the picture is passed over, so a stretch in Haifa points beyond Haifa.
 */
const exitLabel = (beyond: string[], framed: string[]): string | undefined => {
  const framedCities = new Set(framed.map((id) => CITY_STATIONS[id]).filter(Boolean))
  for (const id of beyond) {
    const city = CITY_STATIONS[id]
    if (city && !framedCities.has(city)) return translate(`serviceStatus.cities.${city}`) ?? undefined
    if (END_STATIONS.has(id)) return stationName(id)
  }
  return beyond.length > 0 ? stationName(beyond[beyond.length - 1]) : undefined
}

const EXIT_INSETS = { top: RAIL_MAP_EXIT_INSET, bottom: RAIL_MAP_EXIT_INSET }

type DisruptionMapProps = {
  lineId: string
  disruption: Disruption
}

/**
 * Where the disruption is, as a still picture: the network map framed on the stretch it names and a
 * station past each end, as tall as the stretch needs, with the line in its colour and the rest of the
 * network in grey, the stations it concerns badged as the map badges them, and arrows naming where
 * the line goes on. Nothing when the disruption names no stretch, or the line is not on the map.
 */
export function DisruptionMap({ lineId, disruption }: DisruptionMapProps) {
  const [width, setWidth] = useState(0)
  const line = getRailLine(lineId)
  if (!line || !disruption.section) return null

  const dayType = dayTypeForLine(line.id)
  const height = railMapSectionHeight(dayType, line.id, disruption.section, width, {
    ...MAP_HEIGHT,
    insets: EXIT_INSETS.top + EXIT_INSETS.bottom,
  })
  // Only this disruption is drawn: the map gets a status with this line, and this alone on it.
  const status = { lines: [{ lineId: line.id, disruptions: [disruption] }] }
  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      testID={`disruption-map-${disruption.id}`}
    >
      {/* Drawn once the width is known, so the stretch is framed at the height made for it. */}
      {width > 0 && (
        <RailMap
          status={status}
          dayType={dayType}
          selectedLineId={line.id}
          focusSection={disruption.section}
          sectionExitLabel={exitLabel}
          insets={EXIT_INSETS}
          interactive={false}
          style={styles.map}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  frame: {
    marginTop: theme.spacing[2],
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
}))
