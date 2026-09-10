/**
 * Geometry of the Service Status map, traced from Israel Railways' current
 * network map (the artwork the map is modelled on) so lines, bends and station
 * dots sit exactly where the original draws them.
 *
 * Units: the original's pixels divided by 9.13, so the drawing is 100 units wide.
 * Every line is an explicit polyline (flat x,y pairs) with the index of each of
 * its calling points in that polyline; `stop` is false where the line passes a
 * station without calling, which the original marks with a short tick instead
 * of a dot. Regenerate rather than hand-edit: the numbers come from the trace.
 */
import type { RailLineId } from "./rail-lines"

export const MAP_BOUNDS = { width: 100, height: 282.15 }

export type TracedStation = {
  id: string
  /** Index of the station's point in the line's `points` (x,y pairs → index into pairs). */
  index: number
  /** False where the line runs through without calling. */
  stop: boolean
}

export type TracedLine = {
  /** Flat x,y pairs along the line, in map units. */
  points: number[]
  /** Calling points in corridor order. */
  stations: TracedStation[]
}

export const LINE_GEOMETRY: Record<RailLineId, TracedLine> = {
  "1": {
    points: [
      54.74, 15.14, 54.75, 21.65, 54.76, 30.69, 54.76, 35.07, 54.76, 39.43, 54.71, 41.73, 54.6, 43.59, 54.36, 44.91, 54.11, 45.76,
      53.73, 46.59, 53.0, 47.79, 52.11, 48.86, 49.56, 51.48, 48.66, 52.71, 48.0, 54.05, 47.75, 56.91, 47.75, 65.66, 47.75, 74.39,
      47.75, 78.64, 47.75, 83.02, 47.75, 91.79, 47.75, 100.55, 47.75, 109.53, 47.75, 118.13, 47.75, 125.52, 47.75, 132.92, 47.75,
      140.33, 47.95, 142.83, 48.21, 143.7, 48.63, 144.51, 49.35, 145.52, 49.93, 146.2, 52.74, 149.0, 53.67, 149.84, 54.81, 150.6,
      55.86, 151.01, 58.27, 151.26, 60.24, 151.26, 61.41, 151.36, 64.73, 151.3, 66.05, 151.05, 66.11, 151.02, 66.24, 150.96,
      66.37, 150.91, 66.5, 150.85, 66.62, 150.79, 66.74, 150.72, 66.86, 150.65, 66.98, 150.58, 67.1, 150.49, 67.21, 150.42, 67.32,
      150.33, 67.74, 149.99, 72.42, 145.32, 76.17, 141.58,
    ],
    stations: [
      { id: "1600", index: 0, stop: true },
      { id: "1500", index: 1, stop: true },
      { id: "1400", index: 2, stop: true },
      { id: "700", index: 3, stop: true },
      { id: "1300", index: 4, stop: true },
      { id: "1220", index: 10, stop: true },
      { id: "2100", index: 12, stop: true },
      { id: "2200", index: 14, stop: true },
      { id: "2300", index: 15, stop: true },
      { id: "2500", index: 16, stop: true },
      { id: "2800", index: 17, stop: true },
      { id: "2820", index: 18, stop: false },
      { id: "3100", index: 19, stop: false },
      { id: "3300", index: 20, stop: false },
      { id: "3400", index: 21, stop: false },
      { id: "3500", index: 22, stop: false },
      { id: "3600", index: 23, stop: true },
      { id: "3700", index: 24, stop: true },
      { id: "4600", index: 25, stop: true },
      { id: "4900", index: 26, stop: true },
      { id: "8600", index: 38, stop: true },
      { id: "300", index: 53, stop: true },
      { id: "400", index: 54, stop: true },
    ],
  },
  "2": {
    points: [
      43.58, 74.4, 43.59, 78.76, 43.59, 83.14, 43.59, 91.89, 43.59, 96.28, 43.59, 100.65, 43.59, 109.38, 43.59, 118.12, 43.59,
      125.52, 43.59, 132.92, 43.59, 140.31, 43.59, 141.62, 43.84, 143.81, 44.33, 145.35, 44.94, 146.59, 45.59, 147.55, 46.68,
      148.86, 52.02, 154.21, 56.97, 159.16, 60.57, 162.76, 60.57, 171.61, 60.56, 172.84, 60.45, 173.71, 60.25, 174.47, 59.91,
      175.15, 58.83, 176.54, 55.17, 180.23, 49.99, 185.45, 45.93, 189.54, 42.9, 192.63, 42.46, 193.37, 42.17, 194.34, 42.17,
      203.08,
    ],
    stations: [
      { id: "2800", index: 0, stop: true },
      { id: "2820", index: 1, stop: true },
      { id: "3100", index: 2, stop: true },
      { id: "3300", index: 3, stop: true },
      { id: "3310", index: 4, stop: true },
      { id: "3400", index: 5, stop: true },
      { id: "3500", index: 6, stop: true },
      { id: "3600", index: 7, stop: true },
      { id: "3700", index: 8, stop: true },
      { id: "4600", index: 9, stop: true },
      { id: "4900", index: 10, stop: true },
      { id: "4800", index: 17, stop: true },
      { id: "5150", index: 18, stop: true },
      { id: "5000", index: 20, stop: true },
      { id: "5300", index: 26, stop: true },
      { id: "5200", index: 27, stop: true },
      { id: "5410", index: 28, stop: true },
      { id: "5800", index: 31, stop: true },
      { id: "5900", index: 32, stop: true },
    ],
  },
  "3": {
    points: [
      53.33, 15.14, 53.34, 21.64, 53.42, 30.68, 53.34, 35.05, 53.34, 39.43, 53.34, 41.95, 53.07, 44.25, 52.64, 45.65, 51.83,
      47.05, 48.42, 50.62, 47.35, 52.16, 46.68, 53.65, 46.47, 54.65, 46.33, 56.9, 46.33, 65.72, 46.33, 74.39, 46.33, 109.4, 46.33,
      118.13, 46.33, 125.52, 46.33, 132.92, 46.33, 140.32, 46.42, 140.79, 46.46, 142.5, 46.59, 143.26, 47.36, 145.08, 48.02,
      146.13, 48.99, 147.24, 61.02, 159.28, 61.93, 160.37, 62.52, 161.3, 62.86, 162.02, 63.07, 162.65, 63.4, 164.4, 63.4, 171.59,
      63.42, 175.68, 63.42, 187.19, 63.42, 198.67, 63.42, 210.15, 63.42, 221.64, 63.42, 233.14, 63.42, 237.12,
    ],
    stations: [
      { id: "1600", index: 0, stop: true },
      { id: "1500", index: 1, stop: true },
      { id: "1400", index: 2, stop: true },
      { id: "700", index: 3, stop: false },
      { id: "1300", index: 4, stop: false },
      { id: "1220", index: 8, stop: true },
      { id: "2100", index: 9, stop: true },
      { id: "2200", index: 11, stop: true },
      { id: "2300", index: 13, stop: true },
      { id: "2500", index: 14, stop: false },
      { id: "2800", index: 15, stop: true },
      { id: "3500", index: 16, stop: true },
      { id: "3600", index: 17, stop: true },
      { id: "3700", index: 18, stop: true },
      { id: "4600", index: 19, stop: true },
      { id: "4900", index: 20, stop: true },
      { id: "5000", index: 33, stop: true },
      { id: "5010", index: 34, stop: true },
      { id: "6900", index: 35, stop: true },
      { id: "6150", index: 36, stop: true },
      { id: "7000", index: 37, stop: true },
      { id: "8550", index: 38, stop: true },
      { id: "7300", index: 39, stop: true },
      { id: "7320", index: 40, stop: true },
    ],
  },
  "3X": {
    points: [
      66.51, 27.31, 59.72, 27.29, 55.09, 27.32, 54.22, 27.4, 53.14, 27.7, 52.77, 27.91, 52.54, 28.13, 52.16, 28.81, 51.95, 29.69,
      51.92, 30.69, 51.92, 42.17, 51.52, 44.56, 51.28, 45.16, 50.65, 46.29, 47.29, 49.79, 46.08, 51.57, 45.68, 52.38, 45.4, 53.21,
      45.05, 54.87, 45.02, 56.9, 45.02, 83.15, 45.02, 109.39, 45.02, 118.12, 45.02, 125.52, 45.02, 132.92, 45.02, 140.33, 45.03,
      142.26, 45.18, 143.24, 45.83, 145.22, 46.83, 146.87, 47.34, 147.46, 59.97, 160.18, 60.59, 160.94, 61.36, 162.16, 61.74,
      163.2, 61.99, 165.07, 61.99, 171.6, 61.99, 210.16, 61.99, 221.69, 61.99, 233.14, 61.99, 237.11,
    ],
    stations: [
      { id: "1840", index: 0, stop: true },
      { id: "1820", index: 1, stop: true },
      { id: "1400", index: 9, stop: true },
      { id: "1220", index: 13, stop: true },
      { id: "2100", index: 14, stop: true },
      { id: "2200", index: 17, stop: true },
      { id: "2300", index: 19, stop: true },
      { id: "3100", index: 20, stop: true },
      { id: "3500", index: 21, stop: true },
      { id: "3600", index: 22, stop: true },
      { id: "3700", index: 23, stop: true },
      { id: "4600", index: 24, stop: true },
      { id: "4900", index: 25, stop: true },
      { id: "5000", index: 36, stop: true },
      { id: "7000", index: 37, stop: true },
      { id: "8550", index: 38, stop: false },
      { id: "7300", index: 39, stop: true },
      { id: "7320", index: 40, stop: true },
    ],
  },
  "4": {
    points: [
      66.51, 25.91, 59.73, 25.94, 54.33, 26.02, 53.45, 26.14, 52.27, 26.58, 51.53, 27.13, 51.0, 28.0, 50.66, 29.04, 50.49, 30.69,
      50.49, 35.07, 50.49, 39.43, 50.46, 43.37, 50.1, 44.46, 49.45, 45.51, 46.2, 48.95, 44.88, 50.82, 44.38, 51.84, 44.01, 52.78,
      43.88, 53.29, 43.66, 54.98, 43.57, 56.9,
    ],
    stations: [
      { id: "1840", index: 0, stop: true },
      { id: "1820", index: 1, stop: true },
      { id: "1400", index: 8, stop: true },
      { id: "700", index: 9, stop: true },
      { id: "1300", index: 10, stop: true },
      { id: "1220", index: 13, stop: true },
      { id: "2100", index: 14, stop: true },
      { id: "2200", index: 17, stop: true },
      { id: "2300", index: 20, stop: true },
    ],
  },
  "5": {
    points: [
      42.17, 91.89, 42.17, 100.65, 42.17, 109.39, 42.17, 118.13, 42.17, 125.52, 42.17, 132.91, 42.17, 140.31, 42.17, 141.18,
      42.35, 143.37, 42.53, 144.34, 43.31, 146.52, 43.72, 147.31, 44.29, 148.17, 45.15, 149.21, 56.0, 160.14, 64.84, 168.98,
      64.84, 171.6, 64.84, 175.68, 64.84, 176.89, 64.94, 177.55, 65.16, 178.19, 65.63, 178.98, 66.52, 179.99, 72.04, 185.51,
      72.64, 186.04,
    ],
    stations: [
      { id: "3300", index: 0, stop: true },
      { id: "3400", index: 1, stop: true },
      { id: "3500", index: 2, stop: true },
      { id: "3600", index: 3, stop: true },
      { id: "3700", index: 4, stop: true },
      { id: "4600", index: 5, stop: true },
      { id: "4900", index: 6, stop: true },
      { id: "5150", index: 14, stop: true },
      { id: "5000", index: 16, stop: true },
      { id: "5010", index: 17, stop: true },
      { id: "6300", index: 24, stop: true },
    ],
  },
  "25": {
    points: [
      42.17, 91.89, 42.17, 100.65, 42.17, 109.39, 42.17, 118.13, 42.17, 125.52, 42.17, 132.91, 42.17, 140.31, 42.17, 141.18,
      42.35, 143.37, 42.53, 144.34, 43.31, 146.52, 43.72, 147.31, 44.29, 148.17, 45.15, 149.21, 56.0, 160.14, 59.32, 163.47,
      59.32, 171.6, 59.26, 172.05, 58.98, 173.82, 58.77, 174.35, 58.47, 174.81, 48.95, 184.42,
    ],
    stations: [
      { id: "3300", index: 0, stop: true },
      { id: "3400", index: 1, stop: true },
      { id: "3500", index: 2, stop: true },
      { id: "3600", index: 3, stop: true },
      { id: "3700", index: 4, stop: true },
      { id: "4600", index: 5, stop: true },
      { id: "4900", index: 6, stop: true },
      { id: "5150", index: 14, stop: true },
      { id: "5000", index: 16, stop: true },
      { id: "5200", index: 21, stop: true },
    ],
  },
  "6": {
    points: [
      50.58, 109.38, 50.62, 108.32, 50.79, 107.56, 51.12, 106.96, 51.52, 106.55, 52.25, 106.22, 53.01, 106.07, 55.59, 106.02,
      61.69, 106.02, 68.87, 106.02, 74.26, 106.02, 78.2, 106.07, 79.18, 106.27, 79.86, 106.63, 80.32, 107.25, 80.59, 108.11,
      80.59, 111.4, 80.55, 112.69, 80.36, 113.46, 80.02, 114.03, 79.49, 114.45, 78.97, 114.63, 78.42, 114.76, 75.36, 114.76,
      74.24, 114.9, 65.66, 114.84, 57.09, 114.84, 42.72, 114.84, 41.77, 115.25, 41.42, 115.53, 41.22, 115.81, 41.02, 116.21,
      40.85, 116.76, 40.74, 118.12, 40.74, 125.52, 40.74, 132.92, 40.74, 140.33, 40.72, 147.72, 40.74, 155.12, 40.74, 162.52,
      40.74, 169.9, 40.71, 177.31, 40.74, 184.7, 40.74, 194.35, 40.74, 203.09, 40.74, 211.84, 40.74, 220.41, 40.78, 224.64, 41.16,
      225.62, 41.48, 226.09, 41.89, 226.46, 42.5, 226.78, 43.38, 226.89, 50.7, 226.89, 57.39, 226.96, 58.82, 227.22, 59.53,
      227.52, 59.87, 227.81, 60.14, 228.18, 60.33, 228.59, 60.47, 229.13, 60.57, 230.13, 60.57, 233.13, 60.59, 237.11,
    ],
    stations: [
      { id: "3500", index: 0, stop: true },
      { id: "2940", index: 7, stop: true },
      { id: "2960", index: 8, stop: true },
      { id: "9200", index: 9, stop: true },
      { id: "8700", index: 10, stop: true },
      { id: "8800", index: 16, stop: true },
      { id: "4250", index: 24, stop: true },
      { id: "4170", index: 25, stop: true },
      { id: "4100", index: 26, stop: true },
      { id: "3600", index: 33, stop: true },
      { id: "3700", index: 34, stop: true },
      { id: "4600", index: 35, stop: true },
      { id: "4900", index: 36, stop: true },
      { id: "4640", index: 37, stop: true },
      { id: "4660", index: 38, stop: true },
      { id: "4680", index: 39, stop: true },
      { id: "4690", index: 40, stop: true },
      { id: "9800", index: 41, stop: true },
      { id: "9000", index: 42, stop: true },
      { id: "5800", index: 43, stop: true },
      { id: "5900", index: 44, stop: true },
      { id: "9600", index: 45, stop: true },
      { id: "9650", index: 46, stop: true },
      { id: "9700", index: 53, stop: true },
      { id: "7300", index: 62, stop: true },
      { id: "7320", index: 63, stop: true },
    ],
  },
  "7": {
    points: [
      49.2, 109.38, 49.18, 118.13, 49.18, 125.52, 49.18, 132.91, 49.18, 140.31, 49.18, 141.07, 49.35, 142.61, 49.51, 143.14,
      49.89, 143.86, 50.42, 144.61, 51.0, 145.29, 53.72, 148.02, 54.56, 148.76, 55.53, 149.39, 56.63, 149.68, 57.95, 149.78,
      61.41, 149.78, 66.27, 149.85, 66.36, 149.85, 66.46, 149.86, 66.55, 149.87, 66.65, 149.89, 66.74, 149.91, 66.82, 149.95,
      66.91, 149.99, 67.0, 150.03, 67.08, 150.08, 67.16, 150.13, 67.21, 150.16, 68.84, 151.64, 85.52, 168.32, 86.16, 168.89,
    ],
    stations: [
      { id: "3500", index: 0, stop: true },
      { id: "3600", index: 1, stop: true },
      { id: "3700", index: 2, stop: true },
      { id: "4600", index: 3, stop: true },
      { id: "4900", index: 4, stop: true },
      { id: "8600", index: 16, stop: true },
      { id: "680", index: 31, stop: true },
    ],
  },
  "12": {
    points: [71.89, 83.14, 80.33, 91.62, 81.31, 92.86, 81.77, 93.77, 81.99, 94.74, 82.04, 98.38, 82.04, 104.91, 82.06, 111.39],
    stations: [
      { id: "3900", index: 0, stop: true },
      { id: "4300", index: 5, stop: true },
      { id: "4310", index: 6, stop: true },
      { id: "8800", index: 7, stop: true },
    ],
  },
  "9": {
    points: [
      57.81, 171.6, 57.82, 172.23, 57.71, 172.95, 57.49, 173.6, 57.16, 174.19, 56.81, 174.62, 53.32, 178.12, 52.43, 178.95, 51.77,
      179.36, 51.25, 179.54, 50.6, 179.65, 50.22, 179.68, 49.8, 179.61,
    ],
    stations: [
      { id: "5000", index: 0, stop: true },
      { id: "9100", index: 12, stop: true },
    ],
  },
  "10": {
    points: [
      77.16, 142.56, 73.42, 146.3, 71.85, 147.89, 71.54, 148.34, 71.33, 148.85, 71.06, 149.84, 71.03, 150.49, 71.24, 151.48,
      71.54, 152.18, 71.87, 152.61, 87.08, 167.91,
    ],
    stations: [
      { id: "400", index: 0, stop: true },
      { id: "300", index: 1, stop: true },
      { id: "680", index: 10, stop: true },
    ],
  },
  "11": {
    points: [
      93.37, 49.34, 83.59, 49.38, 73.84, 49.4, 64.1, 49.4, 56.41, 49.4, 56.14, 49.4, 55.93, 49.4, 55.75, 49.38, 55.6, 49.36,
      55.47, 49.34, 55.35, 49.33, 55.24, 49.33, 55.12, 49.35, 54.98, 49.38, 54.83, 49.43, 54.65, 49.51, 54.44, 49.62, 54.18,
      49.76, 53.89, 49.93, 53.57, 50.13, 53.23, 50.36, 52.88, 50.6, 52.53, 50.85, 52.17, 51.12, 51.83, 51.38, 51.51, 51.64, 51.2,
      51.89, 50.94, 52.14, 50.71, 52.35, 50.51, 52.56, 50.35, 52.76, 50.21, 52.96, 50.09, 53.15, 49.98, 53.34, 49.89, 53.54,
      49.81, 53.72, 49.74, 53.9, 49.68, 54.09, 49.62, 54.27, 49.56, 54.47, 49.51, 54.65, 49.45, 54.85, 49.41, 55.04, 49.38, 55.24,
      49.35, 55.42, 49.33, 55.62, 49.32, 55.82, 49.31, 56.0, 49.31, 56.2, 49.3, 56.39, 49.3, 56.58, 49.3, 56.77, 49.29, 56.96,
      49.28, 57.14, 49.28, 57.33, 49.28, 57.51, 49.28, 57.69, 49.28, 57.88, 49.28, 58.06, 49.28, 58.24, 49.28, 58.42, 49.29, 58.6,
      49.29, 58.78, 49.29, 58.96, 49.29, 59.15, 49.18, 65.66,
    ],
    stations: [
      { id: "1280", index: 0, stop: true },
      { id: "1260", index: 1, stop: true },
      { id: "1250", index: 2, stop: true },
      { id: "1240", index: 3, stop: true },
      { id: "1220", index: 16, stop: true },
      { id: "2100", index: 29, stop: true },
      { id: "2200", index: 40, stop: true },
      { id: "2300", index: 52, stop: true },
      { id: "2500", index: 65, stop: true },
    ],
  },
  "8": {
    points: [64.82, 233.13, 66.92, 233.38, 67.57, 233.63, 68.15, 234.01, 78.95, 244.78, 79.54, 245.29],
    stations: [
      { id: "7300", index: 0, stop: true },
      { id: "7500", index: 5, stop: true },
    ],
  },
}

export type LabelSide = "left" | "right" | "above" | "below"

export type StationLabelSpec = {
  /** Which side of the anchor the text sits on: `left` means the text ends at the anchor. */
  side: LabelSide
  x: number
  y: number
  /** Wrap width, in map units. */
  maxWidth: number
  /** Inside a city box the city prefix is dropped ("Tel Aviv - HaShalom" → "HaShalom"). */
  stationNameOnly?: boolean
}

/** Where every station's name goes, measured from the original. */
export const STATION_LABELS: Record<string, StationLabelSpec> = {
  "1600": { side: "above", x: 52.46, y: 14.13, maxWidth: 7.78 }, // נהריה
  "1500": { side: "left", x: 52.35, y: 21.52, maxWidth: 7.34 }, // עכו
  "1820": { side: "right", x: 59.26, y: 24.32, maxWidth: 6.46 }, // אחיהוד
  "1840": { side: "right", x: 67.47, y: 26.83, maxWidth: 10.08 }, // כרמיאל
  "1400": { side: "left", x: 49.51, y: 30.18, maxWidth: 11.39 }, // קריית מוצקין
  "700": { side: "left", x: 49.51, y: 35.21, maxWidth: 9.31 }, // קריית חיים
  "1300": { side: "left", x: 49.51, y: 39.59, maxWidth: 12.16 }, // חוצות המפרץ
  "1220": { side: "left", x: 48.96, y: 44.36, maxWidth: 23.44 }, // מרכזית המפרץ
  "1240": { side: "right", x: 63.64, y: 47.1, maxWidth: 10.08 }, // יקנעם - כפר יהושע
  "2100": { side: "left", x: 45.13, y: 48.19, maxWidth: 19.17, stationNameOnly: true }, // מרכז השמונה
  "1260": { side: "above", x: 83.68, y: 48.41, maxWidth: 5.81 }, // עפולה ר. איתן
  "1250": { side: "below", x: 73.82, y: 50.27, maxWidth: 10.62 }, // מגדל העמק - כפר ברוך
  "1280": { side: "left", x: 93.98, y: 51.42, maxWidth: 10.73 }, // בית שאן
  "2200": { side: "left", x: 42.94, y: 51.86, maxWidth: 6.9, stationNameOnly: true }, // בת גלים
  "2300": { side: "left", x: 42.5, y: 56.46, maxWidth: 10.08, stationNameOnly: true }, // חוף הכרמל
  "2500": { side: "right", x: 50.16, y: 65.17, maxWidth: 8.76 }, // עתלית
  "2800": { side: "left", x: 42.61, y: 74.04, maxWidth: 9.86 }, // בנימינה
  "2820": { side: "left", x: 42.61, y: 78.92, maxWidth: 17.42 }, // קיסריה - פרדס חנה
  "3900": { side: "left", x: 70.97, y: 83.02, maxWidth: 17.42 }, // חדרה - מזרח
  "3100": { side: "left", x: 42.5, y: 83.02, maxWidth: 15.77 }, // חדרה - מערב
  "3300": { side: "left", x: 41.07, y: 91.57, maxWidth: 7.34 }, // נתניה
  "3310": { side: "left", x: 42.61, y: 95.56, maxWidth: 13.58 }, // נתניה - ספיר
  "4300": { side: "right", x: 83.13, y: 98.52, maxWidth: 12.92 }, // שומרון - טייבה
  "3400": { side: "left", x: 41.18, y: 100.55, maxWidth: 9.64 }, // בית יהושע
  "8700": { side: "right", x: 73.71, y: 103.61, maxWidth: 8.21 }, // כפר סבא - נורדאו
  "4310": { side: "right", x: 83.02, y: 104.82, maxWidth: 14.79 }, // טירה - כוכב יאיר
  "2940": { side: "above", x: 55.53, y: 104.93, maxWidth: 5.81 }, // רעננה מערב
  "2960": { side: "above", x: 61.61, y: 104.93, maxWidth: 5.91 }, // רעננה דרום
  "9200": { side: "above", x: 68.78, y: 105.04, maxWidth: 8.87 }, // הוד השרון - סוקולוב
  "3500": { side: "left", x: 41.07, y: 108.87, maxWidth: 9.86 }, // הרצליה
  "8800": { side: "right", x: 83.02, y: 112.92, maxWidth: 12.49 }, // ראש העין - צפון
  "4100": { side: "below", x: 57.12, y: 115.88, maxWidth: 7.01 }, // בני ברק
  "4170": { side: "below", x: 65.72, y: 115.88, maxWidth: 10.08 }, // פתח תקווה  - קריית אריה
  "4250": { side: "below", x: 74.26, y: 115.88, maxWidth: 10.08 }, // פתח תקווה - סגולה
  "3600": { side: "left", x: 39.76, y: 117.85, maxWidth: 15.01, stationNameOnly: true }, // אוניברסיטה
  "3700": { side: "left", x: 39.76, y: 125.19, maxWidth: 16.32, stationNameOnly: true }, // סבידור מרכז
  "4600": { side: "left", x: 39.76, y: 132.42, maxWidth: 8.87, stationNameOnly: true }, // השלום
  "4900": { side: "left", x: 39.65, y: 139.98, maxWidth: 8.54, stationNameOnly: true }, // ההגנה
  "400": { side: "right", x: 78.09, y: 142.06, maxWidth: 18.62 }, // מודיעין - מרכז
  "4640": { side: "left", x: 38.34, y: 147.7, maxWidth: 9.86 }, // צומת חולון
  "300": { side: "right", x: 74.04, y: 148.14, maxWidth: 11.17 }, // פאתי מודיעין
  "8600": { side: "above", x: 61.34, y: 148.74, maxWidth: 12.05 }, // נמל תעופה בן גוריון
  "4660": { side: "left", x: 38.34, y: 154.6, maxWidth: 12.6 }, // חולון - וולפסון
  "4800": { side: "left", x: 50.49, y: 156.19, maxWidth: 8.87 }, //
  "5150": { side: "left", x: 54.87, y: 160.79, maxWidth: 11.72 }, // לוד גני אביב
  "4680": { side: "left", x: 38.44, y: 162.32, maxWidth: 13.58 }, // בת ים - יוספטל
  "680": { side: "right", x: 88.06, y: 168.4, maxWidth: 12.38, stationNameOnly: true }, // יצחק נבון
  "4690": { side: "left", x: 38.44, y: 170.04, maxWidth: 14.46 }, // בת ים - קוממיות
  "5000": { side: "right", x: 65.72, y: 171.41, maxWidth: 3.18 }, // לוד
  "5010": { side: "right", x: 65.83, y: 174.97, maxWidth: 5.26 }, // רמלה
  "9100": { side: "left", x: 50.27, y: 176.23, maxWidth: 9.86 }, // ראשון לציון - הראשונים
  "9800": { side: "left", x: 39.76, y: 176.51, maxWidth: 10.62 }, // ראשון לציון - משה דיין
  "5300": { side: "right", x: 55.64, y: 182.58, maxWidth: 5.37 }, // באר יעקב
  "9000": { side: "left", x: 39.65, y: 184.67, maxWidth: 11.06 }, // יבנה מערב
  "5200": { side: "right", x: 51.48, y: 187.73, maxWidth: 9.53 }, // רחובות
  "6900": { side: "right", x: 64.4, y: 187.84, maxWidth: 6.35 }, // מזכרת בתיה
  "6300": { side: "right", x: 72.07, y: 188.94, maxWidth: 8.87 }, // בית שמש
  "5410": { side: "right", x: 46.55, y: 191.29, maxWidth: 8.54 }, // יבנה מזרח
  "5800": { side: "left", x: 39.76, y: 193.48, maxWidth: 7.45 }, // אשדוד עד הלום
  "6150": { side: "right", x: 64.4, y: 198.63, maxWidth: 16.76 }, // קריית מלאכי - יואב
  "5900": { side: "left", x: 39.76, y: 203.29, maxWidth: 9.75 }, // אשקלון
  "7000": { side: "right", x: 64.4, y: 210.24, maxWidth: 7.89 }, // קריית גת
  "9600": { side: "left", x: 39.76, y: 211.72, maxWidth: 5.91 }, // שדרות
  "9650": { side: "left", x: 39.76, y: 220.37, maxWidth: 6.02 }, // נתיבות
  "8550": { side: "right", x: 64.51, y: 221.47, maxWidth: 12.16 }, // להבים - רהט
  "9700": { side: "above", x: 50.77, y: 226.07, maxWidth: 6.46 }, // אופקים
  "7300": { side: "left", x: 59.58, y: 233.63, maxWidth: 17.2, stationNameOnly: true }, // צפון/אוניברסיטה
  "7320": { side: "left", x: 64.07, y: 238.99, maxWidth: 10.73, stationNameOnly: true }, // מרכז
  "7500": { side: "left", x: 80.18, y: 247.04, maxWidth: 8.76 }, // דימונה
}

export type CityBox = {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** Bottom-left corner of the city name inside the box. */
  labelX: number
  labelY: number
  name: { he: string; en: string; ru: string; ar: string }
}

/** The rounded frames the original draws around the big cities' stations. */
export const CITY_BOXES: CityBox[] = [
  {
    id: "haifa",
    x: 16.98,
    y: 42.17,
    width: 39.65,
    height: 16.54,
    labelX: 18.62,
    labelY: 57.17,
    name: { he: "חיפה", en: "Haifa", ru: "Хайфа", ar: "حيفا" },
  },
  {
    id: "telaviv",
    x: 16.98,
    y: 116.32,
    width: 34.06,
    height: 25.85,
    labelX: 18.51,
    labelY: 140.64,
    name: { he: "תל־אביב", en: "Tel Aviv", ru: "Тель-Авив", ar: "تل أبيب" },
  },
  {
    id: "jerusalem",
    x: 82.26,
    y: 163.09,
    width: 15.99,
    height: 17.31,
    labelX: 83.9,
    labelY: 178.64,
    name: { he: "ירושלים", en: "Jerusalem", ru: "Иерусалим", ar: "القدس" },
  },
  {
    id: "beersheva",
    x: 40.09,
    y: 231.11,
    width: 26.73,
    height: 17.42,
    labelX: 42.28,
    labelY: 246.33,
    name: { he: "באר שבע", en: "Be'er Sheva", ru: "Беэр-Шева", ar: "بئر السبع" },
  },
]

/** Line badges beside the terminals, where the original prints its train-number ranges. */
export const TERMINAL_BADGES: { lineId: RailLineId; x: number; y: number }[] = [
  { lineId: "6", x: 37.79, y: 111.06 },
  { lineId: "3X", x: 58.38, y: 242.17 },
  { lineId: "3", x: 51.31, y: 15.22 },
  { lineId: "3", x: 63.09, y: 242.17 },
  { lineId: "1", x: 79.35, y: 143.81 },
  { lineId: "9", x: 55.97, y: 171.63 },
  { lineId: "8", x: 58.6, y: 235.82 },
  { lineId: "8", x: 81.6, y: 245.35 },
  { lineId: "2", x: 41.46, y: 71.03 },
  { lineId: "2", x: 44.25, y: 203.18 },
  { lineId: "5", x: 40.09, y: 88.5 },
  { lineId: "5", x: 74.7, y: 186.09 },
  { lineId: "7", x: 40.14, y: 111.06 },
  { lineId: "7", x: 89.38, y: 170.32 },
  { lineId: "4", x: 68.67, y: 29.03 },
  { lineId: "3X", x: 71.08, y: 29.03 },
  { lineId: "11", x: 51.31, y: 67.25 },
  { lineId: "1", x: 48.96, y: 15.22 },
  { lineId: "25", x: 37.79, y: 88.5 },
]

/** Stretches the original draws with the "irregular intervals" marking (check the timetable). */
export const IRREGULAR_STRETCHES: { lineId: RailLineId; fromStationId: string; toStationId: string }[] = [
  { lineId: "5", fromStationId: "3300", toStationId: "3600" },
  { lineId: "25", fromStationId: "3300", toStationId: "3600" },
]

/** The original's water, in map units: the sea west of the shore, the shoreline itself and the two lakes. */
export const WATER = {
  /** Closed polygon: the shore, then the map's top and left edges (flat x,y pairs). */
  sea: [
    0.0, 0.0, 48.96, 0.0, 48.96, 0.0, 48.96, 28.04, 48.85, 30.01, 48.95, 40.31, 48.77, 41.4, 48.41, 42.5, 47.58, 44.25, 46.7,
    45.56, 44.0, 48.63, 42.2, 51.7, 41.8, 53.01, 41.06, 56.74, 40.42, 67.69, 40.44, 69.0, 40.82, 70.97, 40.01, 73.17, 39.55,
    80.18, 39.22, 82.15, 39.21, 88.5, 38.74, 91.13, 37.91, 104.93, 37.44, 109.97, 37.27, 114.35, 36.47, 124.86, 36.69, 127.05,
    36.24, 129.24, 35.99, 131.43, 35.73, 136.69, 35.44, 139.1, 35.3, 143.48, 34.98, 146.77, 33.36, 171.74, 33.03, 173.93, 32.97,
    177.0, 32.67, 181.82, 32.43, 183.79, 32.35, 186.42, 31.52, 193.65, 30.35, 200.66, 28.25, 209.64, 26.3, 215.99, 25.04, 219.72,
    23.14, 224.53, 20.36, 230.89, 16.25, 238.77, 11.86, 246.0, 7.14, 252.79, 3.83, 256.96, 1.08, 259.36, 0.83, 260.24, 0.0,
    260.24,
  ],
  /** The shoreline, drawn as a pale ribbon. */
  shore: [
    48.19, 0.0, 48.19, 28.04, 48.08, 30.01, 48.18, 40.31, 48.01, 41.4, 47.65, 42.5, 46.81, 44.25, 45.94, 45.56, 43.23, 48.63,
    41.43, 51.7, 41.03, 53.01, 40.3, 56.74, 39.65, 67.69, 39.67, 69.0, 40.05, 70.97, 39.24, 73.17, 38.78, 80.18, 38.46, 82.15,
    38.44, 88.5, 37.97, 91.13, 37.14, 104.93, 36.67, 109.97, 36.51, 114.35, 35.71, 124.86, 35.93, 127.05, 35.48, 129.24, 35.22,
    131.43, 34.96, 136.69, 34.68, 139.1, 34.53, 143.48, 34.22, 146.77, 32.6, 171.74, 32.27, 173.93, 32.2, 177.0, 31.91, 181.82,
    31.66, 183.79, 31.59, 186.42, 30.76, 193.65, 29.58, 200.66, 27.48, 209.64, 25.53, 215.99, 24.27, 219.72, 22.38, 224.53, 19.59,
    230.89, 15.49, 238.77, 11.1, 246.0, 6.37, 252.79, 3.07, 256.96, 0.32, 259.36, 0.07, 260.24,
  ],
  lakes: [
    [
      46.6, 99.89, 46.93, 99.45, 47.04, 98.36, 46.82, 97.15, 46.28, 96.17, 44.8, 95.02, 43.26, 94.58, 40.31, 94.47, 38.55, 93.92,
      36.25, 92.72, 33.63, 92.39, 33.41, 92.17, 24.32, 92.17, 22.34, 92.39, 20.59, 93.04, 19.55, 93.98, 18.67, 96.06, 18.67,
      98.14, 19.22, 99.89,
    ],
    [
      257.78, 99.89, 258.11, 97.7, 257.23, 95.95, 255.86, 95.02, 253.23, 94.47, 227.6, 94.47, 226.83, 94.8, 225.3, 94.91, 222.34,
      96.11, 220.26, 95.89, 217.63, 94.8, 214.9, 94.47, 200.0, 94.58, 197.92, 95.35, 196.55, 96.82, 196.22, 98.25, 196.55, 99.89,
    ],
  ],
}

/** The aeroplane above Ben Gurion Airport's name (centre x, bottom y, height). */
export const AIRPORT_ICON = { x: 61.39, y: 144.14, height: 3.18 }

/** Names the original shortens on the map. */
export const LABEL_TEXT_OVERRIDES: Record<string, Partial<Record<"he" | "en" | "ru" | "ar", string>>> = {
  "8600": { he: "נתב״ג" },
  "1260": { he: "עפולה", en: "Afula" },
}
