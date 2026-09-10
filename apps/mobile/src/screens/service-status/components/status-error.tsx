import { Button, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"

type StatusErrorProps = {
  onRetry: () => void
}

export function StatusError({ onRetry }: StatusErrorProps) {
  return (
    <View style={styles.wrapper} testID="service-status-error">
      <Image source={require("../../../../assets/info.png")} style={styles.icon} />
      <Text style={styles.title} tx="serviceStatus.error" />
      <Text style={styles.description} tx="serviceStatus.errorDescription" />
      <Button onPress={onRetry} title={translate("common.tryAgain") ?? "Try again"} />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[7],
  },
  icon: {
    width: 64,
    height: 64,
    marginBottom: theme.spacing[3],
    tintColor: theme.colors.error,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: theme.spacing[1],
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    color: theme.colors.label,
    marginBottom: theme.spacing[3],
  },
}))
