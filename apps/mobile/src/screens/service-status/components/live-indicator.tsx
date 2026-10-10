import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { ServiceStatusSnapshot } from "@/services/api"

type LiveIndicatorProps = {
  realtime: ServiceStatusSnapshot["realtime"]
}

/** A green dot and "Live", or a grey one and a warning when the realtime feed is down. */
export function LiveIndicator({ realtime }: LiveIndicatorProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.dot, !realtime.available && styles.dotOffline]} />
      <Text style={styles.text} preset="small">
        {realtime.available ? translate("serviceStatus.live") : translate("serviceStatus.liveUnavailable")}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
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
