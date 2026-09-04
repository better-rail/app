import { matchStations, nameSimilarity, KnownStation } from "../gtfs/station-match"
import type { GtfsStop } from "../gtfs/parse"

const known: KnownStation[] = [
  { id: "1220", hebrew: "מרכזית המפרץ (לב המפרץ)", english: "HaMifrats Central Station", lat: 32.792942, lon: 35.032964 },
  { id: "3700", hebrew: "תל אביב - סבידור מרכז", english: "Tel Aviv - Savidor Center", lat: 32.083715, lon: 34.798247 },
]

const node = (stopId: string, stopName: string, lat: number, lon: number): GtfsStop => ({
  stopId,
  stopCode: "",
  stopName,
  lat,
  lon,
  locationType: 0,
  parentStation: null,
  platformCode: null,
})

describe("matchStations", () => {
  it("maps several GTFS nodes of one physical station to the same rail id", () => {
    // HaMifratz appears as two GTFS station nodes: the main one (0m) and the
    // coast-line node (~400m) with a different qualifier name.
    const nodes = [
      node("42507", "מרכזית המפרץ", 32.792942, 35.032964),
      node("37388", "מרכזית המפרץ/קו החוף", 32.793921, 35.037079),
    ]
    const r = matchStations(nodes, known)
    expect(r.gtfsStationToRailId.get("42507")).toBe(1220)
    expect(r.gtfsStationToRailId.get("37388")).toBe(1220)
    expect(r.unclaimedNodes).toHaveLength(0)
  })

  it("leaves a genuinely new station unclaimed", () => {
    const nodes = [node("51798", "חדרה מזרח", 32.443813, 34.95123)]
    const r = matchStations(nodes, known)
    expect(r.gtfsStationToRailId.size).toBe(0)
    expect(r.unclaimedNodes.map((n) => n.stopId)).toEqual(["51798"])
  })

  it("reports known stations with no node as unmatched (not a failure)", () => {
    const nodes = [node("42507", "מרכזית המפרץ", 32.792942, 35.032964)]
    const r = matchStations(nodes, known)
    expect(r.unmatched.map((m) => m.railId)).toEqual([3700])
  })

  it("name similarity ignores '(...)' / '/...' qualifiers", () => {
    expect(nameSimilarity("מרכזית המפרץ (לב המפרץ)", "מרכזית המפרץ/קו החוף")).toBeGreaterThanOrEqual(0.9)
  })
})
