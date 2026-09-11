import { ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { TrueSheet, type DidPresentEvent, type SheetDetent } from "@lodev09/react-native-true-sheet"
import { Text } from "@/components"
import { LineList } from "./line-list"
import { LiveIndicator } from "./live-indicator"
import { useServiceStatus } from "../use-service-status"

/** The status sheet's name, for resizing it from the screen. */
export const STATUS_SHEET = "service-status"
/** The sheets' resting heights, as in Apple Maps: the header alone, half the screen with the map above, nearly full. */
export const SHEET_DETENTS: SheetDetent[] = ["peek", 0.45, 0.9]
/** The detent the sheets open at, and go back to. */
export const SHEET_OPEN_DETENT = 1
/**
 * The height of both sheets' headers, and so of both at their smallest detent. The list sits behind
 * the card at that size; iOS rounds a pill's corners by its height, so equal heights keep the list's
 * corners from showing past the card's.
 */
export const SHEET_HEADER_HEIGHT = 88

type StatusSheetProps = {
  onSelectLine: (lineId: string) => void
  /** Called once presented, with the sheet's top edge measured from the top of the screen. */
  onPresented: (top: number) => void
}

/** The sheet that is always there over the map, as in Apple Maps: every line's status. */
export function StatusSheet({ onSelectLine, onPresented }: StatusSheetProps) {
  const onDidPresent = (e: DidPresentEvent) => onPresented(e.nativeEvent.position)

  return (
    <TrueSheet
      name={STATUS_SHEET}
      detents={SHEET_DETENTS}
      initialDetentIndex={SHEET_OPEN_DETENT}
      dimmed={false}
      dismissible={false}
      scrollable
      header={<ListHeader />}
      onDidPresent={onDidPresent}
      // Android's back button closes the screen, not this sheet.
      onBackPress={() => false}
      testID="service-status-sheet"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LineList onSelectLine={onSelectLine} />
      </ScrollView>
    </TrueSheet>
  )
}

/** The list's heading, with how live the data is. */
function ListHeader() {
  const { data } = useServiceStatus()
  return (
    <View style={styles.header}>
      <Text style={styles.title} tx="serviceStatus.subtitle" />
      {data && <LiveIndicator realtime={data.realtime} compact />}
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    padding: theme.spacing[4],
    paddingBottom: rt.insets.bottom + theme.spacing[5],
  },
  header: {
    minHeight: SHEET_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[2],
  },
  title: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "600",
  },
}))
