import { useMemo, useRef } from "react"
import { ActivityIndicator, type LayoutChangeEvent, Platform, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { addDays, format } from "date-fns"
import { Button, Text } from "@/components"
import { dateFnsLocalization, translate } from "@/i18n"
import { getStationById, stationsObject } from "@/data/stations"
import type { DayType } from "@/data/rail-map-layout"
import type { StationInfo, StationNotice } from "@/services/api"
import { openLink } from "@/utils/helpers/open-link"
import { openInMaps } from "@/utils/helpers/open-in-maps"
import { useNow } from "@/hooks"
import { timezoneCorrection } from "@/utils/helpers/date-helpers"
import { DisruptionCard } from "./disruption-card"
import { EntranceCard } from "./entrance-card"
import { LineDeparturesCard } from "./line-departures-card"
import { StationMap } from "./station-map"
import { type StationTile, StationTiles } from "./station-tiles"
import { stationOpenState, wallClockOf } from "../station-hours"
import { stationStatus, stationStatusKind } from "../station-status"
import { useServiceStatus } from "../use-service-status"
import { useStationDepartures, useStationInfo } from "../use-station-info"

type StationDetailsProps = {
  stationId: string
  dayType: DayType
  onSelectLine: (lineId: string) => void
  onGoNow: (stationId: string) => void
  /** Scrolls the card to a position (from the top of its content), opening it up if need be. */
  scrollTo: (y: number) => void
}

/** The sections a tile takes the card to. */
type SectionName = "disruptions" | "lines" | "entrances"

/** A Sunday, to name the days of the week from. */
const A_SUNDAY = new Date(2023, 0, 1)

/**
 * A station's card, after TfL Go's: "Go now", the tiles, what is wrong there, the next trains on each
 * line calling, each entrance with its hours and facilities, and the rest of the station's page.
 */
export function StationDetails({ stationId, dayType, onSelectLine, onGoNow, scrollTo }: StationDetailsProps) {
  const { data } = useServiceStatus()
  const { data: info, isLoading: infoLoading, isError: infoError } = useStationInfo(stationId)
  const { data: departures } = useStationDepartures(stationId)
  const status = useMemo(() => stationStatus(data, stationId, dayType), [data, stationId, dayType])
  const kind = stationStatusKind(status, !!info?.closed)
  // Israel's clock, wherever the phone is: the station is there. Ticks each minute for the countdowns.
  const now = timezoneCorrection(useNow())
  const clock = wallClockOf(now)
  const openState = info ? stationOpenState(info.entrances, clock) : infoLoading ? undefined : { state: "unknown" as const }
  const dayName = (day: number) => format(addDays(A_SUNDAY, day - 1), "EEE", { locale: dateFnsLocalization })
  const station = stationsObject[stationId]
  const name = getStationById(stationId)?.name ?? stationId

  // Where each section starts, from the top of the card's content, for the tiles.
  const rootTop = useRef(0)
  const sectionTops = useRef<Partial<Record<SectionName, number>>>({})
  const onRootLayout = (e: LayoutChangeEvent) => {
    rootTop.current = e.nativeEvent.layout.y
  }
  const onSectionLayout = (section: SectionName) => (e: LayoutChangeEvent) => {
    sectionTops.current[section] = e.nativeEvent.layout.y
  }
  const onTilePress = (tile: StationTile) => {
    const section: SectionName = tile === "open" ? "entrances" : status.disruptions.length > 0 ? "disruptions" : "lines"
    const top = sectionTops.current[section]
    if (top !== undefined) scrollTo(rootTop.current + top)
  }

  return (
    <View style={styles.details} onLayout={onRootLayout} testID="station-details">
      <Button
        title={translate("plan.title") ?? "Trip Plan"}
        onPress={() => onGoNow(stationId)}
        testID="station-go-now"
      />

      <StationTiles status={status} kind={kind} openState={openState} today={clock.day} dayName={dayName} onPress={onTilePress} />

      {info?.closed && (
        <View style={[styles.card, styles.closedCard]} testID="station-closed">
          <Text style={styles.closedTitle} tx="serviceStatus.station.stationClosed" />
          {info.closed.until && (
            <Text style={styles.closedText}>
              {translate("serviceStatus.station.stationClosedUntil", {
                time: format(new Date(info.closed.until), "EEE, d MMM", { locale: dateFnsLocalization }),
              })}
            </Text>
          )}
          {info.closed.text && <Text style={styles.closedText}>{info.closed.text}</Text>}
        </View>
      )}

      {status.disruptions.length > 0 && (
        <Section title={translate("serviceStatus.station.disruptions") ?? ""} onLayout={onSectionLayout("disruptions")}>
          {status.disruptions.map((d) => (
            <DisruptionCard key={d.id} disruption={d} />
          ))}
        </Section>
      )}

      {info && info.notices.length > 0 && (
        <Section title={translate("serviceStatus.station.notices") ?? ""}>
          {info.notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </Section>
      )}

      <Section title={translate("serviceStatus.station.linesHere") ?? ""} onLayout={onSectionLayout("lines")}>
        {status.lines.length === 0 ? (
          <Text style={styles.empty} tx="serviceStatus.station.noLinesToday" />
        ) : (
          status.lines.map(({ line, status: lineStatus }) => (
            <LineDeparturesCard
              key={line.id}
              line={line}
              status={lineStatus}
              directions={
                departures === undefined ? undefined : (departures?.lines.find((l) => l.lineId === line.id)?.directions ?? [])
              }
              now={now}
              onPress={() => onSelectLine(line.id)}
            />
          ))
        )}
      </Section>

      {infoLoading && !info && <ActivityIndicator size="small" color="grey" style={styles.loader} />}
      {infoError && !info && <Text style={styles.empty} tx="serviceStatus.station.infoUnavailable" />}

      {info && info.entrances.length > 0 && (
        <Section title={translate("serviceStatus.station.entrances") ?? ""} onLayout={onSectionLayout("entrances")}>
          {info.entrances.map((entrance) => (
            <EntranceCard key={entrance.id} entrance={entrance} dayName={dayName} clock={clock} />
          ))}
        </Section>
      )}

      {station && (
        <Section title={translate("serviceStatus.station.location") ?? ""}>
          <StationMap name={name} lat={station.lat} lon={station.lon} entrances={info?.entrances ?? []} />
          {/* The map box is the way into the maps app; Android has no box yet, so it gets a link. */}
          {Platform.OS !== "ios" && (
            <LinkRow
              label={translate("serviceStatus.station.openInMaps") ?? ""}
              onPress={() => openInMaps(station.lat, station.lon, name)}
              testID="station-open-in-maps"
            />
          )}
        </Section>
      )}

      {info && <Information info={info} />}

      {info && (
        <Section title="">
          <LinkRow
            label={translate("serviceStatus.station.moreInfo") ?? ""}
            onPress={() => openLink(info.link)}
            testID="station-page-link"
          />
        </Section>
      )}
    </View>
  )
}

function Section({
  title,
  onLayout,
  children,
}: {
  title: string
  onLayout?: (e: LayoutChangeEvent) => void
  children: React.ReactNode
}) {
  return (
    <View style={styles.section} onLayout={onLayout}>
      {title !== "" && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  )
}

/** A notice from the station's page: what it says, when it was posted, and its link. */
function NoticeCard({ notice }: { notice: StationNotice }) {
  return (
    <View style={styles.card} testID={`station-notice-${notice.id}`}>
      {notice.header !== "" && <Text style={styles.noticeHeader}>{notice.header}</Text>}
      {notice.content !== "" && <Text style={styles.noticeContent}>{notice.content}</Text>}
      {notice.date && (
        <Text style={styles.noticeDate} preset="small">
          {notice.date}
        </Text>
      )}
    </View>
  )
}

/** Parking, as label/value rows. */
function Information({ info }: { info: StationInfo }) {
  const rows = [
    { key: "parking", value: info.parking.car },
    { key: "parkingCost", value: info.parking.carCost },
    { key: "bikeParking", value: info.parking.bike },
    { key: "bikeParkingCost", value: info.parking.bikeCost },
  ].filter((row): row is { key: string; value: string } => !!row.value)
  if (rows.length === 0) return null
  return (
    <Section title={translate("serviceStatus.station.information") ?? ""}>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <View key={row.key} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
            <Text style={styles.infoLabel} preset="small">
              {translate(`serviceStatus.station.${row.key}` as "serviceStatus.station.parking")}
            </Text>
            <Text style={styles.infoValue} preset="small">
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  )
}

function LinkRow({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="link" style={styles.link} testID={testID}>
      <Text style={styles.linkText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  details: {
    gap: theme.spacing[5],
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  closedCard: {
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  closedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.error,
  },
  closedText: {
    fontSize: 15,
  },
  empty: {
    fontSize: 15,
    color: theme.colors.label,
  },
  loader: {
    marginVertical: theme.spacing[2],
  },
  noticeHeader: {
    fontSize: 16,
    fontWeight: "600",
  },
  noticeContent: {
    fontSize: 15,
    color: theme.colors.label,
  },
  noticeDate: {
    color: theme.colors.label,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  infoLabel: {
    color: theme.colors.label,
    fontWeight: "600",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
  },
  link: {
    paddingVertical: theme.spacing[2],
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.link,
  },
}))
