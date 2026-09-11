import { ActivityIndicator, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { DisruptionCard } from "./disruption-card"
import { StatusError } from "./status-error"
import { levelDescription } from "../service-status-text"
import { useServiceStatus } from "../use-service-status"

type LineDetailsProps = {
  lineId: string
}

/** What is wrong on a line: each disruption and the trains it concerns, or a line saying nothing is. */
export function LineDetails({ lineId }: LineDetailsProps) {
  const { data, isLoading, isError, refetch } = useServiceStatus()
  const status = data?.lines.find((l) => l.lineId === lineId)

  return (
    <View style={styles.details} testID="line-status-details">
      {isLoading && !data && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {isError && !data && <StatusError onRetry={() => refetch()} />}
      {status && status.disruptions.length > 0 && status.disruptions.map((d) => <DisruptionCard key={d.id} disruption={d} />)}
      {status && status.disruptions.length === 0 && (
        <>
          <Text style={styles.description}>{levelDescription(status.level)}</Text>
          {status.trains.active > 0 && (
            <Text style={styles.counts} preset="small">
              {translate("serviceStatus.trainsActive", { count: status.trains.active })}
            </Text>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  details: {
    gap: theme.spacing[3],
  },
  loader: {
    marginTop: theme.spacing[4],
  },
  description: {
    fontSize: 16,
  },
  counts: {
    color: theme.colors.label,
  },
}))
