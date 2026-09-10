import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { format } from "date-fns"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { ServiceStatusSnapshot } from "@/services/api"

type LiveIndicatorProps = {
  realtime: ServiceStatusSnapshot["realtime"]
  compact?: boolean
}

/** "Live · Updated 15:07", or a warning when the realtime feed is down. */
export function LiveIndicator({ realtime, compact }: LiveIndicatorProps) {
  const updated = realtime.updatedAt ? format(new Date(realtime.updatedAt), "HH:mm") : undefined
  return (
    <View style={[styles.wrapper, compact && styles.compact]}>
      <View style={[styles.dot, !realtime.available && styles.dotOffline]} />
      <Text style={styles.text} preset="small">
        {realtime.available
          ? `${translate("serviceStatus.live")}${updated ? ` · ${translate("serviceStatus.updatedAt", { time: updated })}` : ""}`
          : translate("serviceStatus.liveUnavailable")}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  compact: {
    paddingHorizontal: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
  },
  dotOffline: {
    backgroundColor: theme.colors.dim,
  },
  text: {
    color: theme.colors.label,
  },
}))
