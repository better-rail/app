import { TrueSheet } from "@lodev09/react-native-true-sheet"
import { MapLegend } from "./map-legend"

/** The legend sheet's name, for presenting it from the header button. */
export const LEGEND_SHEET = "service-status-legend"

/** What the markings on the map mean, on a sheet of its own over the status sheet. */
export function LegendSheet() {
  return (
    <TrueSheet name={LEGEND_SHEET} detents={["auto"]} testID="map-legend-sheet">
      <MapLegend />
    </TrueSheet>
  )
}
