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
      54.74, 15.14, 54.75, 21.65, 54.76, 30.69, 54.76, 35.07, 54.76, 39.43, 54.71, 43.7, 54.3, 45.13, 54.11, 45.77, 53.65, 46.79,
      53.0, 47.79, 52.19, 48.78, 49.56, 51.48, 48.65, 52.69, 48.0, 54.05, 47.75, 56.91, 47.75, 65.66, 47.75, 74.39, 47.75, 78.64,
      47.75, 83.02, 47.75, 91.79, 47.75, 100.55, 47.75, 109.53, 47.75, 118.13, 47.75, 125.52, 47.75, 132.92, 47.75, 140.33, 47.91,
      142.72, 48.26, 143.81, 48.55, 144.42, 49.85, 146.12, 53.48, 149.69, 54.61, 150.49, 55.32, 150.85, 55.86, 151.18, 60.46,
      151.18, 61.41, 151.36, 64.73, 151.31, 66.16, 151.04, 66.2, 151.02, 66.3, 150.99, 66.39, 150.94, 66.47, 150.9, 66.56, 150.85,
      66.65, 150.81, 66.74, 150.76, 66.82, 150.7, 66.9, 150.65, 66.99, 150.59, 67.06, 150.54, 67.67, 150.08, 72.42, 145.32, 76.17,
      141.58,
    ],
    stations: [
      { id: "1600", index: 0, stop: true },
      { id: "1500", index: 1, stop: true },
      { id: "1400", index: 2, stop: true },
      { id: "700", index: 3, stop: true },
      { id: "1300", index: 4, stop: true },
      { id: "1220", index: 9, stop: true },
      { id: "2100", index: 11, stop: true },
      { id: "2200", index: 13, stop: true },
      { id: "2300", index: 14, stop: true },
      { id: "2500", index: 15, stop: true },
      { id: "2800", index: 16, stop: true },
      { id: "2820", index: 17, stop: false },
      { id: "3100", index: 18, stop: false },
      { id: "3300", index: 19, stop: false },
      { id: "3400", index: 20, stop: false },
      { id: "3500", index: 21, stop: false },
      { id: "3600", index: 22, stop: true },
      { id: "3700", index: 23, stop: true },
      { id: "4600", index: 24, stop: true },
      { id: "4900", index: 25, stop: true },
      { id: "8600", index: 35, stop: true },
      { id: "300", index: 50, stop: true },
      { id: "400", index: 51, stop: true },
    ],
  },
  "2": {
    points: [
      43.58, 74.4, 43.59, 78.76, 43.59, 83.14, 43.59, 91.89, 43.59, 96.28, 43.59, 100.65, 43.59, 109.38, 43.59, 118.12, 43.59,
      125.52, 43.59, 132.92, 43.59, 140.31, 43.66, 143.59, 44.41, 145.56, 44.99, 146.7, 46.6, 148.78, 52.02, 154.21, 56.97,
      159.16, 59.35, 161.57, 60.07, 162.42, 60.48, 162.88, 60.48, 171.61, 60.51, 173.38, 60.31, 174.37, 60.04, 174.97, 58.92,
      176.46, 55.17, 180.23, 49.99, 185.45, 45.93, 189.54, 42.88, 192.62, 42.55, 193.18, 42.21, 194.05, 42.17, 194.34, 42.16,
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
      { id: "4800", index: 15, stop: true },
      { id: "5150", index: 16, stop: true },
      { id: "5000", index: 20, stop: true },
      { id: "5300", index: 25, stop: true },
      { id: "5200", index: 26, stop: true },
      { id: "5410", index: 27, stop: true },
      { id: "5800", index: 31, stop: true },
      { id: "5900", index: 32, stop: true },
    ],
  },
  "3": {
    points: [
      53.33, 15.14, 53.34, 21.64, 53.42, 30.68, 53.34, 35.05, 53.34, 39.43, 53.25, 44.25, 52.65, 45.66, 51.83, 47.05, 48.42,
      50.62, 47.34, 52.15, 46.68, 53.65, 46.46, 54.65, 46.44, 56.08, 46.33, 56.9, 46.33, 65.72, 46.33, 74.39, 46.33, 109.4, 46.33,
      118.13, 46.33, 125.52, 46.33, 132.92, 46.33, 140.32, 46.44, 141.07, 46.46, 142.61, 46.58, 143.26, 47.46, 145.28, 47.94,
      146.04, 48.83, 147.08, 61.11, 159.35, 62.06, 160.55, 62.48, 161.2, 63.04, 162.54, 63.36, 163.53, 63.36, 171.59, 63.42,
      175.68, 63.42, 187.19, 63.42, 198.67, 63.42, 210.15, 63.42, 221.64, 63.42, 233.14, 63.41, 237.12,
    ],
    stations: [
      { id: "1600", index: 0, stop: true },
      { id: "1500", index: 1, stop: true },
      { id: "1400", index: 2, stop: true },
      { id: "700", index: 3, stop: false },
      { id: "1300", index: 4, stop: false },
      { id: "1220", index: 7, stop: true },
      { id: "2100", index: 8, stop: true },
      { id: "2200", index: 10, stop: true },
      { id: "2300", index: 13, stop: true },
      { id: "2500", index: 14, stop: false },
      { id: "2800", index: 15, stop: true },
      { id: "3500", index: 16, stop: true },
      { id: "3600", index: 17, stop: true },
      { id: "3700", index: 18, stop: true },
      { id: "4600", index: 19, stop: true },
      { id: "4900", index: 20, stop: true },
      { id: "5000", index: 32, stop: true },
      { id: "5010", index: 33, stop: true },
      { id: "6900", index: 34, stop: true },
      { id: "6150", index: 35, stop: true },
      { id: "7000", index: 36, stop: true },
      { id: "8550", index: 37, stop: true },
      { id: "7300", index: 38, stop: true },
      { id: "7320", index: 39, stop: true },
    ],
  },
  "3X": {
    points: [
      66.51, 27.31, 59.72, 27.29, 54.33, 27.31, 53.03, 27.72, 52.6, 28.03, 52.19, 28.7, 51.94, 29.57, 51.92, 30.69, 51.92, 42.28,
      51.54, 44.57, 50.65, 46.29, 47.29, 49.79, 46.12, 51.47, 45.63, 52.48, 45.4, 53.21, 45.04, 54.87, 45.02, 56.9, 45.02, 83.15,
      45.02, 109.39, 45.02, 118.12, 45.02, 125.52, 45.02, 132.92, 45.02, 140.33, 45.02, 142.38, 45.15, 143.13, 45.82, 145.22,
      46.82, 146.88, 60.04, 160.25, 60.53, 160.85, 61.42, 162.26, 61.93, 163.42, 61.93, 171.6, 61.99, 210.16, 61.99, 221.69,
      61.99, 233.14, 61.99, 237.11,
    ],
    stations: [
      { id: "1840", index: 0, stop: true },
      { id: "1820", index: 1, stop: true },
      { id: "1400", index: 7, stop: true },
      { id: "1220", index: 10, stop: true },
      { id: "2100", index: 11, stop: true },
      { id: "2200", index: 14, stop: true },
      { id: "2300", index: 16, stop: true },
      { id: "3100", index: 17, stop: true },
      { id: "3500", index: 18, stop: true },
      { id: "3600", index: 19, stop: true },
      { id: "3700", index: 20, stop: true },
      { id: "4600", index: 21, stop: true },
      { id: "4900", index: 22, stop: true },
      { id: "5000", index: 31, stop: true },
      { id: "7000", index: 32, stop: true },
      { id: "8550", index: 33, stop: false },
      { id: "7300", index: 34, stop: true },
      { id: "7320", index: 35, stop: true },
    ],
  },
  "4": {
    points: [
      66.51, 25.91, 59.73, 25.94, 53.56, 26.01, 52.26, 26.56, 51.77, 26.88, 51.37, 27.31, 50.78, 28.51, 50.61, 29.13, 50.49,
      30.69, 50.49, 35.07, 50.49, 39.43, 50.47, 43.26, 50.12, 44.46, 49.45, 45.51, 46.2, 48.95, 44.87, 50.82, 44.01, 52.78, 43.66,
      53.56, 43.66, 56.9,
    ],
    stations: [
      { id: "1840", index: 0, stop: true },
      { id: "1820", index: 1, stop: true },
      { id: "1400", index: 8, stop: true },
      { id: "700", index: 9, stop: true },
      { id: "1300", index: 10, stop: true },
      { id: "1220", index: 13, stop: true },
      { id: "2100", index: 14, stop: true },
      { id: "2200", index: 16, stop: true },
      { id: "2300", index: 18, stop: true },
    ],
  },
  "5": {
    points: [
      42.17, 91.89, 42.17, 100.65, 42.17, 109.39, 42.17, 118.13, 42.17, 125.52, 42.17, 132.91, 42.17, 140.31, 42.17, 141.4, 42.5,
      144.24, 43.31, 146.52, 43.78, 147.4, 44.42, 148.36, 44.99, 149.06, 56.0, 160.14, 57.89, 162.06, 58.75, 163.08, 59.66,
      164.67, 61.27, 165.45, 63.8, 168.01, 64.37, 168.85, 64.56, 169.24, 64.82, 170.55, 64.84, 171.6, 64.84, 175.68, 64.84, 177.0,
      64.92, 177.55, 65.2, 178.3, 65.55, 178.89, 66.35, 179.82, 72.2, 185.67, 72.64, 186.04,
    ],
    stations: [
      { id: "3300", index: 0, stop: true },
      { id: "3400", index: 1, stop: true },
      { id: "3500", index: 2, stop: true },
      { id: "3600", index: 3, stop: true },
      { id: "3700", index: 4, stop: true },
      { id: "4600", index: 5, stop: true },
      { id: "4900", index: 6, stop: true },
      { id: "5150", index: 13, stop: true },
      { id: "5000", index: 22, stop: true },
      { id: "5010", index: 23, stop: true },
      { id: "6300", index: 30, stop: true },
    ],
  },
  "25": {
    points: [
      42.17, 91.89, 42.17, 100.65, 42.17, 109.39, 42.17, 118.13, 42.17, 125.52, 42.17, 132.91, 42.17, 140.31, 42.17, 141.4, 42.5,
      144.24, 43.31, 146.52, 43.78, 147.4, 44.42, 148.36, 44.99, 149.06, 56.0, 160.14, 57.89, 162.06, 58.75, 163.08, 59.66,
      164.67, 61.27, 165.45, 63.8, 168.01, 64.37, 168.85, 64.56, 169.24, 64.82, 170.55, 64.84, 171.6, 64.82, 170.55, 64.56,
      169.24, 64.37, 168.85, 63.8, 168.01, 61.17, 165.39, 60.13, 164.9, 59.84, 164.86, 59.58, 164.96, 59.29, 165.3, 59.29, 172.07,
      59.05, 173.6, 58.8, 174.36, 58.4, 174.9, 48.95, 184.42,
    ],
    stations: [
      { id: "3300", index: 0, stop: true },
      { id: "3400", index: 1, stop: true },
      { id: "3500", index: 2, stop: true },
      { id: "3600", index: 3, stop: true },
      { id: "3700", index: 4, stop: true },
      { id: "4600", index: 5, stop: true },
      { id: "4900", index: 6, stop: true },
      { id: "5150", index: 13, stop: true },
      { id: "5000", index: 22, stop: true },
      { id: "5200", index: 36, stop: true },
    ],
  },
  "6": {
    points: [
      50.58, 109.38, 50.61, 108.21, 50.73, 107.67, 51.03, 107.03, 51.51, 106.53, 52.03, 106.12, 55.59, 106.12, 61.69, 106.02,
      68.87, 106.02, 74.26, 106.02, 79.3, 106.12, 79.87, 106.6, 80.33, 107.24, 80.59, 108.11, 80.59, 111.4, 80.59, 112.35, 80.39,
      113.47, 80.03, 114.04, 79.5, 114.48, 79.08, 114.78, 74.24, 114.78, 65.66, 114.84, 57.09, 114.84, 42.83, 114.83, 41.76,
      115.21, 41.49, 115.42, 41.19, 115.78, 41.0, 116.21, 40.83, 116.87, 40.74, 118.12, 40.74, 125.52, 40.74, 132.92, 40.74,
      140.33, 40.72, 144.69, 40.45, 145.17, 39.79, 145.74, 39.53, 146.11, 39.35, 146.67, 39.32, 147.72, 39.32, 155.12, 39.32,
      162.52, 39.32, 169.9, 39.35, 170.24, 39.54, 170.73, 40.39, 171.59, 40.72, 172.29, 40.72, 177.31, 40.74, 184.7, 40.74,
      194.35, 40.74, 203.09, 40.74, 211.84, 40.74, 220.41, 40.82, 225.19, 41.2, 225.73, 41.53, 226.19, 41.87, 226.47, 42.5,
      226.89, 50.7, 226.89, 57.5, 226.94, 59.04, 227.27, 59.54, 227.5, 59.88, 227.8, 60.22, 228.27, 60.54, 229.13, 60.54, 233.13,
      60.59, 237.11,
    ],
    stations: [
      { id: "3500", index: 0, stop: true },
      { id: "2940", index: 6, stop: true },
      { id: "2960", index: 7, stop: true },
      { id: "9200", index: 8, stop: true },
      { id: "8700", index: 9, stop: true },
      { id: "8800", index: 14, stop: true },
      { id: "4250", index: 20, stop: true },
      { id: "4170", index: 21, stop: true },
      { id: "4100", index: 22, stop: true },
      { id: "3600", index: 29, stop: true },
      { id: "3700", index: 30, stop: true },
      { id: "4600", index: 31, stop: true },
      { id: "4900", index: 32, stop: true },
      { id: "4640", index: 38, stop: true },
      { id: "4660", index: 39, stop: true },
      { id: "4680", index: 40, stop: true },
      { id: "4690", index: 41, stop: true },
      { id: "9800", index: 46, stop: true },
      { id: "9000", index: 47, stop: true },
      { id: "5800", index: 48, stop: true },
      { id: "5900", index: 49, stop: true },
      { id: "9600", index: 50, stop: true },
      { id: "9650", index: 51, stop: true },
      { id: "9700", index: 57, stop: true },
      { id: "7300", index: 64, stop: true },
      { id: "7320", index: 65, stop: true },
    ],
  },
  "7": {
    points: [
      49.2, 109.38, 49.17, 118.13, 49.18, 125.52, 49.18, 132.91, 49.18, 140.31, 49.18, 141.29, 49.33, 142.61, 49.5, 143.15, 49.81,
      143.77, 50.83, 145.14, 54.47, 148.69, 55.53, 149.4, 56.3, 149.77, 61.41, 149.77, 65.29, 149.85, 65.63, 149.86, 65.97, 149.9,
      66.29, 149.97, 66.6, 150.07, 66.91, 150.18, 67.21, 150.31, 67.49, 150.47, 67.77, 150.66, 68.03, 150.87, 68.29, 151.11,
      68.76, 151.57, 86.16, 168.89,
    ],
    stations: [
      { id: "3500", index: 0, stop: true },
      { id: "3600", index: 1, stop: true },
      { id: "3700", index: 2, stop: true },
      { id: "4600", index: 3, stop: true },
      { id: "4900", index: 4, stop: true },
      { id: "8600", index: 13, stop: true },
      { id: "680", index: 26, stop: true },
    ],
  },
  "12": {
    points: [71.89, 83.14, 80.42, 91.7, 81.45, 93.04, 81.94, 93.76, 81.94, 98.38, 82.04, 104.91, 82.06, 111.39],
    stations: [
      { id: "3900", index: 0, stop: true },
      { id: "4300", index: 4, stop: true },
      { id: "4310", index: 5, stop: true },
      { id: "8800", index: 6, stop: true },
    ],
  },
  "9": {
    points: [
      57.81, 171.6, 57.82, 172.51, 57.67, 173.17, 57.24, 174.12, 56.58, 174.85, 52.77, 178.66, 52.27, 179.09, 51.77, 179.38,
      51.26, 179.56, 50.1, 179.69, 49.8, 179.61,
    ],
    stations: [
      { id: "5000", index: 0, stop: true },
      { id: "9100", index: 10, stop: true },
    ],
  },
  "10": {
    points: [
      77.16, 142.56, 73.42, 146.3, 71.76, 147.96, 71.39, 148.63, 71.05, 149.84, 71.0, 150.38, 71.29, 151.7, 71.52, 152.19, 87.08,
      167.91,
    ],
    stations: [
      { id: "400", index: 0, stop: true },
      { id: "300", index: 1, stop: true },
      { id: "680", index: 8, stop: true },
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
      49.29, 58.78, 49.29, 58.96, 49.29, 59.15, 49.17, 65.66,
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
    points: [64.82, 233.13, 67.03, 233.4, 67.58, 233.6, 68.07, 233.93, 79.1, 244.93, 79.54, 245.29],
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
  /** The original sets major stations larger. */
  size: "big" | "small"
  /** Inside a city box the city prefix is dropped ("Tel Aviv - HaShalom" → "HaShalom"). */
  stationNameOnly?: boolean
  /** The original puts the second language under the name here rather than over it. */
  secondaryBelow?: boolean
}

/** Where every station's name goes, measured from the original. */
export const STATION_LABELS: Record<string, StationLabelSpec> = {
  "1600": { side: "above", x: 52.46, y: 14.13, maxWidth: 6.9, size: "big" }, // נהריה
  "1500": { side: "left", x: 52.35, y: 20.87, maxWidth: 6.57, size: "small" }, // עכו
  "1820": { side: "right", x: 59.26, y: 23.71, maxWidth: 5.81, size: "small" }, // אחיהוד
  "1840": { side: "right", x: 67.47, y: 26.29, maxWidth: 8.98, size: "big" }, // כרמיאל
  "1400": { side: "left", x: 49.51, y: 30.18, maxWidth: 10.08, size: "small" }, // קריית מוצקין
  "700": { side: "left", x: 49.51, y: 34.56, maxWidth: 8.32, size: "small" }, // קריית חיים
  "1300": { side: "left", x: 49.51, y: 38.94, maxWidth: 10.84, size: "small" }, // חוצות המפרץ
  "1220": { side: "left", x: 48.96, y: 43.87, maxWidth: 20.81, size: "small" }, // מרכזית המפרץ
  "1240": { side: "right", x: 63.64, y: 45.95, maxWidth: 8.98, size: "small" }, // יקנעם - כפר יהושע
  "2100": { side: "left", x: 45.13, y: 47.54, maxWidth: 17.09, size: "small", stationNameOnly: true }, // מרכז השמונה
  "1260": { side: "above", x: 83.68, y: 48.41, maxWidth: 5.15, size: "small" }, // עפולה ר. איתן
  "1250": { side: "below", x: 73.82, y: 50.27, maxWidth: 9.42, size: "small", secondaryBelow: true }, // מגדל העמק - כפר ברוך
  "1280": { side: "left", x: 93.98, y: 51.81, maxWidth: 9.64, size: "big", secondaryBelow: true }, // בית שאן
  "2200": { side: "left", x: 42.94, y: 51.86, maxWidth: 6.24, size: "small", stationNameOnly: true }, // בת גלים
  "2300": { side: "left", x: 42.5, y: 56.46, maxWidth: 8.98, size: "small", stationNameOnly: true }, // חוף הכרמל
  "2500": { side: "right", x: 50.16, y: 64.62, maxWidth: 7.89, size: "big" }, // עתלית
  "2800": { side: "left", x: 42.61, y: 73.33, maxWidth: 8.87, size: "big" }, // בנימינה
  "2820": { side: "left", x: 42.61, y: 78.26, maxWidth: 15.55, size: "small" }, // קיסריה - פרדס חנה
  "3900": { side: "left", x: 70.97, y: 82.31, maxWidth: 15.55, size: "big" }, // חדרה - מזרח
  "3100": { side: "left", x: 42.5, y: 82.42, maxWidth: 14.02, size: "small" }, // חדרה - מערב
  "3300": { side: "left", x: 41.07, y: 90.85, maxWidth: 6.57, size: "big" }, // נתניה
  "3310": { side: "left", x: 42.61, y: 95.56, maxWidth: 12.16, size: "small" }, // נתניה - ספיר
  "4300": { side: "right", x: 83.13, y: 97.32, maxWidth: 11.5, size: "small" }, // שומרון - טייבה
  "3400": { side: "left", x: 41.18, y: 99.89, maxWidth: 8.54, size: "small" }, // בית יהושע
  "8700": { side: "right", x: 73.71, y: 102.46, maxWidth: 7.34, size: "small" }, // כפר סבא - נורדאו
  "4310": { side: "right", x: 83.02, y: 103.67, maxWidth: 13.14, size: "small" }, // טירה - כוכב יאיר
  "2940": { side: "above", x: 55.53, y: 104.93, maxWidth: 5.15, size: "small" }, // רעננה מערב
  "2960": { side: "above", x: 61.61, y: 104.93, maxWidth: 5.37, size: "small" }, // רעננה דרום
  "9200": { side: "above", x: 68.78, y: 105.04, maxWidth: 8.0, size: "small" }, // הוד השרון - סוקולוב
  "3500": { side: "left", x: 41.07, y: 108.32, maxWidth: 8.87, size: "big" }, // הרצליה
  "8800": { side: "right", x: 83.02, y: 111.66, maxWidth: 11.06, size: "big" }, // ראש העין - צפון
  "4100": { side: "below", x: 57.12, y: 115.88, maxWidth: 6.35, size: "small", secondaryBelow: true }, // בני ברק
  "4170": { side: "below", x: 65.72, y: 115.88, maxWidth: 8.98, size: "small", secondaryBelow: true }, // פתח תקווה  - קריית אריה
  "4250": { side: "below", x: 74.26, y: 115.88, maxWidth: 8.98, size: "small", secondaryBelow: true }, // פתח תקווה - סגולה
  "3600": { side: "left", x: 39.76, y: 117.85, maxWidth: 13.36, size: "big", stationNameOnly: true }, // אוניברסיטה
  "3700": { side: "left", x: 39.76, y: 124.42, maxWidth: 14.46, size: "big", stationNameOnly: true }, // סבידור מרכז
  "4600": { side: "left", x: 39.76, y: 131.87, maxWidth: 8.0, size: "big", stationNameOnly: true }, // השלום
  "4900": { side: "left", x: 39.65, y: 139.27, maxWidth: 7.56, size: "big", stationNameOnly: true }, // ההגנה
  "400": { side: "right", x: 78.09, y: 141.84, maxWidth: 16.54, size: "big" }, // מודיעין - מרכז
  "4640": { side: "left", x: 38.34, y: 147.15, maxWidth: 8.87, size: "small" }, // צומת חולון
  "300": { side: "right", x: 74.04, y: 148.14, maxWidth: 9.97, size: "small" }, // פאתי מודיעין
  "8600": { side: "above", x: 61.34, y: 148.74, maxWidth: 12.05, size: "big" }, // נמל תעופה בן גוריון
  "4660": { side: "left", x: 38.34, y: 154.05, maxWidth: 11.28, size: "small" }, // חולון - וולפסון
  "4800": { side: "left", x: 50.49, y: 156.74, maxWidth: 8.0, size: "small", secondaryBelow: true }, //
  "4680": { side: "left", x: 38.44, y: 161.28, maxWidth: 12.16, size: "small" }, // בת ים - יוספטל
  "5150": { side: "left", x: 54.87, y: 161.39, maxWidth: 10.51, size: "small", secondaryBelow: true }, // לוד גני אביב
  "680": { side: "right", x: 88.06, y: 167.63, maxWidth: 10.95, size: "big", stationNameOnly: true }, // יצחק נבון
  "4690": { side: "left", x: 38.44, y: 168.84, maxWidth: 12.92, size: "small" }, // בת ים - קוממיות
  "5000": { side: "right", x: 65.72, y: 170.92, maxWidth: 2.96, size: "small" }, // לוד
  "5010": { side: "right", x: 65.83, y: 174.97, maxWidth: 4.71, size: "small" }, // רמלה
  "9800": { side: "left", x: 39.76, y: 175.41, maxWidth: 9.42, size: "small" }, // ראשון לציון - משה דיין
  "9100": { side: "left", x: 50.27, y: 175.74, maxWidth: 8.87, size: "small" }, // ראשון לציון - הראשונים
  "5300": { side: "right", x: 55.64, y: 183.13, maxWidth: 4.82, size: "small", secondaryBelow: true }, // באר יעקב
  "9000": { side: "left", x: 39.65, y: 183.52, maxWidth: 9.86, size: "small" }, // יבנה מערב
  "5200": { side: "right", x: 51.48, y: 188.39, maxWidth: 8.43, size: "big", secondaryBelow: true }, // רחובות
  "6900": { side: "right", x: 64.4, y: 189.1, maxWidth: 5.7, size: "small", secondaryBelow: true }, // מזכרת בתיה
  "6300": { side: "right", x: 72.07, y: 189.49, maxWidth: 8.0, size: "big", secondaryBelow: true }, // בית שמש
  "5800": { side: "left", x: 39.76, y: 192.33, maxWidth: 6.68, size: "small" }, // אשדוד עד הלום
  "5410": { side: "right", x: 46.55, y: 192.39, maxWidth: 7.56, size: "small", secondaryBelow: true }, // יבנה מזרח
  "6150": { side: "right", x: 64.4, y: 198.14, maxWidth: 14.9, size: "small" }, // קריית מלאכי - יואב
  "5900": { side: "left", x: 39.76, y: 202.68, maxWidth: 8.76, size: "big" }, // אשקלון
  "7000": { side: "right", x: 64.4, y: 209.58, maxWidth: 7.12, size: "small" }, // קריית גת
  "9600": { side: "left", x: 39.76, y: 211.12, maxWidth: 5.37, size: "small" }, // שדרות
  "9650": { side: "left", x: 39.76, y: 219.72, maxWidth: 5.48, size: "small" }, // נתיבות
  "8550": { side: "right", x: 64.51, y: 220.92, maxWidth: 10.84, size: "small" }, // להבים - רהט
  "9700": { side: "above", x: 50.77, y: 226.07, maxWidth: 5.81, size: "small" }, // אופקים
  "7300": { side: "left", x: 59.58, y: 233.63, maxWidth: 15.22, size: "small", stationNameOnly: true }, // צפון/אוניברסיטה
  "7320": { side: "left", x: 64.07, y: 239.87, maxWidth: 9.64, size: "big", stationNameOnly: true, secondaryBelow: true }, // מרכז
  "7500": { side: "left", x: 80.18, y: 247.65, maxWidth: 7.89, size: "big", secondaryBelow: true }, // דימונה
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

/** The aeroplane above Ben Gurion Airport's name (centre x, bottom y, height). */
export const AIRPORT_ICON = { x: 61.39, y: 144.14, height: 3.18 }

/** Names the original shortens on the map. */
export const LABEL_TEXT_OVERRIDES: Record<string, Partial<Record<"he" | "en" | "ru" | "ar", string>>> = {
  "8600": { he: "נתב״ג" },
  "1260": { he: "עפולה", en: "Afula" },
}
