/**
 * A made-up status snapshot for working on the status screens while no trains run (the small
 * hours, Shabbat). Every level and every kind of disruption is in it, on the lines of the
 * catalogue, with sections the map can draw. Served only with SIMULATE_SERVICE_STATUS on.
 */
import { format } from "date-fns"
import { RAIL_LINES, type RailLine, type RailLineId, getRailLine } from "@/data/rail-lines"
import {
  type AffectedTrain,
  type AffectedTrainStatus,
  type Disruption,
  type DisruptionKind,
  type DisruptionSection,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
  type StationDepartures,
  compareServiceStatusLevels,
  isDisruptedLevel,
} from "@/services/api"

const localized = (he: string, en: string, ru: string, ar: string) => ({ he, en, ru, ar })

const catalogue = (id: RailLineId): RailLine => {
  const line = getRailLine(id)
  if (!line) throw new Error(`No line ${id} in the catalogue`)
  return line
}

/** A naive wall-clock ISO string, as the timetable gives them ("2026-09-11T18:40:00"), some minutes from now. */
const at = (now: Date, minutesFromNow: number): string =>
  format(new Date(now.getTime() + minutesFromNow * 60_000), "yyyy-MM-dd'T'HH:mm:ss")

type TrainSpec = {
  number: number
  status: AffectedTrainStatus
  /** Minutes from now the train left its origin (negative: already on its way). */
  departed: number
  /** Minutes the whole run takes. */
  duration: number
  delay?: number
  /** Runs from the line's last station to its first. */
  back?: boolean
  actualDestinationStationId?: string
  skippedStationIds?: string[]
}

/** A train along the whole of `line`, one way or the other. */
const train = (now: Date, line: RailLine, spec: TrainSpec): AffectedTrain => {
  const ends = [line.stationIds[0], line.stationIds[line.stationIds.length - 1]]
  const [originStationId, destinationStationId] = spec.back ? [ends[1], ends[0]] : ends
  return {
    trainNumber: spec.number,
    status: spec.status,
    originStationId,
    destinationStationId,
    departureTime: at(now, spec.departed),
    arrivalTime: at(now, spec.departed + spec.duration),
    delayMinutes: spec.delay ?? 0,
    actualDestinationStationId: spec.actualDestinationStationId,
    skippedStationIds: spec.skippedStationIds,
  }
}

/** The stretch of `line` between two of its stations, inclusive, in the line's order. */
const section = (line: RailLine, fromStationId: string, toStationId: string): DisruptionSection => {
  const a = line.stationIds.indexOf(fromStationId)
  const b = line.stationIds.indexOf(toStationId)
  if (a < 0 || b < 0) throw new Error(`${fromStationId}–${toStationId} is not on line ${line.id}`)
  return { fromStationId, toStationId, stationIds: line.stationIds.slice(Math.min(a, b), Math.max(a, b) + 1) }
}

const disruption = (
  kind: DisruptionKind,
  level: ServiceStatusLevel,
  where: DisruptionSection | null,
  trains: AffectedTrain[],
): Disruption => ({
  id: where ? `${kind}:${where.fromStationId}-${where.toStationId}` : kind,
  kind,
  level,
  section: where,
  trains,
  source: "realtime",
})

/**
 * Works announced by Israel Railways, as the server reads them out of its updates: no trains on
 * a stretch this weekend, why, free shuttles and reinforced buses instead, and a page about it.
 */
const announcedWorks = (now: Date, line: RailLine, from: string, to: string, trains: AffectedTrain[]): Disruption => {
  const where = section(line, from, to)
  return {
    id: `announcement:${where.fromStationId}-${where.toStationId}`,
    kind: "suspension",
    level: "partSuspended",
    section: where,
    trains,
    source: "announcement",
    reason: localized(
      "עבודות תשתית מצילות חיים באזור זבולון",
      "Life-saving infrastructure works near Zevulun",
      "Работы по обновлению инфраструктуры в районе Звулун",
      "أعمال بنية تحتية منقذة للحياة في منطقة زفولون",
    ),
    alternatives: [
      {
        mode: "shuttle",
        free: true,
        description: localized(
          "היסעים בין חיפה מרכז השמונה לתחנות הצפון",
          "Shuttles between Haifa Center HaShmona and the northern stations",
          "Шаттлы между Хайфа Мерказ ха-Шмона и северными станциями",
          "حافلات بديلة بين حيفا المركز هشمونا ومحطات الشمال",
        ),
      },
      {
        mode: "bus",
        free: false,
        description: localized(
          "קווי אוטובוס מוגברים מחיפה לכיוון נהריה",
          "Reinforced bus lines from Haifa towards Nahariya",
          "Усиленные автобусные маршруты из Хайфы в сторону Нагарии",
          "خطوط حافلات معزّزة من حيفا باتجاه نهاريا",
        ),
      },
    ],
    link: "https://www.rail.co.il/?page=north-200826",
    validity: { from: at(now, -12 * 60), to: at(now, 2 * 24 * 60) },
  }
}

const echo = (line: RailLine): LineStatus["line"] => ({
  badge: line.badge,
  color: line.color,
  name: { he: line.name.he, en: line.name.en },
  stationIds: line.stationIds,
})

/** A line with something wrong: its level is its worst disruption's, its counts follow the trains. */
const disrupted = (line: RailLine, active: number, disruptions: Disruption[]): LineStatus => {
  const sorted = [...disruptions].sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const trains = disruptions.flatMap((d) => d.trains)
  return {
    lineId: line.id,
    level: sorted[0]?.level ?? "goodService",
    disruptions: sorted,
    trains: {
      active,
      delayed: trains.filter((t) => t.status === "delayed").length,
      cancelled: trains.filter((t) => t.status === "cancelled").length,
      maxDelayMinutes: Math.max(0, ...trains.map((t) => t.delayMinutes)),
    },
    line: echo(line),
  }
}

/** A line with nothing wrong, or nothing running. */
const quiet = (line: RailLine, level: ServiceStatusLevel, active: number): LineStatus => ({
  lineId: line.id,
  level,
  disruptions: [],
  trains: { active, delayed: 0, cancelled: 0, maxDelayMinutes: 0 },
  line: echo(line),
})

export const simulatedServiceStatus = (now: Date = new Date()): ServiceStatusSnapshot => {
  const l1 = catalogue("1")
  const l2 = catalogue("2")
  const l3 = catalogue("3")
  const l5 = catalogue("5")
  const l6 = catalogue("6")
  const l7 = catalogue("7")

  const lines: LineStatus[] = [
    // Nahariya – Modi'in: announced works have the trains ending at Haifa, and a few are running late.
    disrupted(l1, 9, [
      announcedWorks(now, l1, "1600", "2100", [
        train(now, l1, {
          number: 139,
          status: "curtailed",
          departed: -70,
          duration: 150,
          actualDestinationStationId: "2100",
          back: true,
        }),
      ]),
      disruption("delays", "minorDelays", null, [
        train(now, l1, { number: 141, status: "delayed", departed: -55, duration: 150, delay: 9 }),
        train(now, l1, { number: 144, status: "delayed", departed: -40, duration: 150, delay: 7, back: true }),
        train(now, l1, { number: 145, status: "delayed", departed: -25, duration: 150, delay: 6 }),
      ]),
    ]),
    // Binyamina – Ashkelon: trains end at Ashdod, nothing on to Ashkelon, and a couple are late.
    disrupted(l2, 7, [
      disruption("curtailment", "partSuspended", section(l2, "5800", "5900"), [
        train(now, l2, { number: 221, status: "curtailed", departed: -70, duration: 130, actualDestinationStationId: "5800" }),
        train(now, l2, { number: 223, status: "curtailed", departed: -40, duration: 130, actualDestinationStationId: "5800" }),
      ]),
      disruption("delays", "minorDelays", null, [
        train(now, l2, { number: 224, status: "delayed", departed: -35, duration: 130, delay: 8, back: true }),
        train(now, l2, { number: 226, status: "delayed", departed: -5, duration: 130, delay: 6, back: true }),
      ]),
    ]),
    // Nahariya – Be'er Sheva: badly late all along.
    disrupted(l3, 8, [
      disruption("delays", "severeDelays", null, [
        train(now, l3, { number: 311, status: "delayed", departed: -95, duration: 180, delay: 22 }),
        train(now, l3, { number: 314, status: "delayed", departed: -80, duration: 180, delay: 17, back: true }),
        train(now, l3, { number: 313, status: "delayed", departed: -50, duration: 180, delay: 11 }),
        train(now, l3, { number: 316, status: "delayed", departed: -20, duration: 180, delay: 6, back: true }),
      ]),
    ]),
    quiet(catalogue("3X"), "goodService", 2),
    quiet(catalogue("4"), "goodService", 4),
    // Netanya – Bet Shemesh: the trains past Lod are cancelled.
    disrupted(l5, 5, [
      disruption("cancellations", "partSuspended", section(l5, "5000", "6300"), [
        train(now, l5, { number: 511, status: "cancelled", departed: -30, duration: 95 }),
        train(now, l5, { number: 514, status: "cancelled", departed: -10, duration: 95, back: true }),
      ]),
    ]),
    quiet(catalogue("25"), "goodService", 2),
    // Herzliya – Be'er Sheva: every train cancelled.
    disrupted(l6, 3, [
      disruption("suspension", "suspended", section(l6, "3500", "7320"), [
        train(now, l6, { number: 611, status: "cancelled", departed: -60, duration: 140 }),
        train(now, l6, { number: 612, status: "cancelled", departed: -45, duration: 140, back: true }),
        train(now, l6, { number: 613, status: "cancelled", departed: -15, duration: 140 }),
      ]),
    ]),
    // Herzliya – Jerusalem: running through the airport without stopping.
    disrupted(l7, 6, [
      {
        ...disruption("skippedStops", "minorDelays", section(l7, "8600", "8600"), [
          train(now, l7, { number: 711, status: "skippingStops", departed: -35, duration: 60, skippedStationIds: ["8600"] }),
          train(now, l7, {
            number: 714,
            status: "skippingStops",
            departed: -20,
            duration: 60,
            back: true,
            skippedStationIds: ["8600"],
          }),
        ]),
        source: "announcement",
        reason: localized(
          'עבודות בתחנת נתב"ג',
          "Works at Ben Gurion Airport station",
          "Работы на станции Бен-Гурион",
          "أعمال في محطة مطار بن غوريون",
        ),
        validity: { from: at(now, -3 * 60), to: null },
      },
      // And two extra trains Israel Railways put on for an event, unknown to the schedule.
      {
        ...disruption("extraTrains", "goodService", null, [
          train(now, l7, { number: 9704, status: "added", departed: 25, duration: 60 }),
          train(now, l7, { number: 9706, status: "added", departed: 55, duration: 60 }),
        ]),
        source: "timetable",
      },
    ]),
    quiet(catalogue("12"), "goodService", 1),
    quiet(catalogue("9"), "goodService", 2),
    quiet(catalogue("10"), "goodService", 2),
    quiet(catalogue("11"), "noService", 0),
    quiet(catalogue("8"), "noService", 0),
  ]

  const counts: Partial<Record<ServiceStatusLevel, number>> = {}
  for (const line of lines) counts[line.level] = (counts[line.level] ?? 0) + 1
  const level = lines
    .filter((l) => isDisruptedLevel(l.level))
    .reduce<ServiceStatusLevel>((worst, l) => (compareServiceStatusLevels(l.level, worst) > 0 ? l.level : worst), "goodService")

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    serviceDate: format(now, "yyyy-MM-dd"),
    realtime: { available: true, updatedAt: now.toISOString() },
    announcements: { updatedAt: now.toISOString() },
    timetable: { checkedAt: now.toISOString(), available: true },
    network: { level, counts },
    lines,
  }
}

/**
 * A made-up departure board for a station, to go with the snapshot: on every line through it, three
 * trains each way over the next hour and a half, with one running late, one cancelled, and the
 * furthest off not yet seen live.
 */
export const simulatedStationDepartures = (stationId: string, now: Date = new Date()): StationDepartures => {
  const lines = RAIL_LINES.filter((line) => line.stationIds.includes(stationId))
  return {
    schemaVersion: 1,
    stationId,
    generatedAt: now.toISOString(),
    realtime: { available: true },
    lines: lines.map((line, lineIndex) => {
      const ends = [line.stationIds[0], line.stationIds[line.stationIds.length - 1]]
      return {
        lineId: line.id,
        directions: ends
          .filter((end) => end !== stationId)
          .map((towardsStationId, direction) => ({
            towardsStationId,
            trains: [0, 1, 2].map((n) => ({
              trainNumber: 400 + 100 * lineIndex + 2 * n + direction,
              time: at(now, 7 + 30 * n + 5 * lineIndex + 3 * direction),
              delayMinutes: n === 1 && direction === 0 ? 12 : n === 0 && lineIndex === 1 ? 4 : 0,
              platform: 1 + direction,
              destinationStationId: towardsStationId,
              cancelled: n === 2 && lineIndex === 1 && direction === 1,
              live: n < 2,
            })),
          })),
      }
    }),
  }
}
