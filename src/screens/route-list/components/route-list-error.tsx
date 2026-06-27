import React from "react"
import { Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"

type Props = {
  errorType: "no-internet" | "request-error"
}

export const RouteListError: React.FC<Props> = function NoInternetConnection({ errorType }) {
  const imageSrc =
    errorType === "no-internet" ? require("../../../../assets/no-connection.png") : require("../../../../assets/info.png")

  const textKey = errorType === "no-internet" ? "routes.noInternetConnection" : "routes.routesError"

  return (
    <View style={styles.messageWrapper}>
      <Image source={imageSrc} style={[styles.icon, { height: errorType === "no-internet" ? 36 : 45 }]} />
      <Text style={styles.text} tx={textKey} />
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  messageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing[8],
    paddingHorizontal: theme.spacing[5],
  },
  icon: {
    width: 45,
    marginBottom: theme.spacing[4],
    tintColor: theme.colors.dim,
    opacity: 0.75,
  },
  text: {
    textAlign: "center",
  },
}))
