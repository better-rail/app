import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { RailMap } from "@/components/rail-map"
import { getRailLine } from "@/data/rail-lines"
import type { Disruption } from "@/services/api"
import { dayTypeForLine } from "../day-type"

/** The picture's height: enough for a stretch of a few stations with their names. */
const MAP_HEIGHT = 190

type DisruptionMapProps = {
  lineId: string
  disruption: Disruption
}

/**
 * Where the disruption is, as a still picture: the network map framed on the stretch it names, with
 * the line in its colour and the rest of the network in grey, and the stations it concerns badged as
 * the map badges them. Nothing when the disruption names no stretch, or the line is not on the map.
 */
export function DisruptionMap({ lineId, disruption }: DisruptionMapProps) {
  const line = getRailLine(lineId)
  if (!line || !disruption.section) return null

  // Only this disruption is drawn: the map gets a status with this line, and this alone on it.
  const status = { lines: [{ lineId: line.id, disruptions: [disruption] }] }
  return (
    <View style={styles.frame} accessible={false} testID={`disruption-map-${disruption.id}`}>
      <RailMap
        status={status}
        dayType={dayTypeForLine(line.id)}
        selectedLineId={line.id}
        focusSection={disruption.section}
        interactive={false}
        style={styles.map}
      />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  frame: {
    marginTop: theme.spacing[2],
    height: MAP_HEIGHT,
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
}))
