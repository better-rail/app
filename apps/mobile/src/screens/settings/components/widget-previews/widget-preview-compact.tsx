import React from "react"
import { Image, View } from "react-native"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { useWidgetPreviewRoute } from "./use-widget-preview-route"
import { styles } from "./widget-preview.styles"

const arrowIcon = require("../../../../../assets/arrow-left.png")

export function WidgetPreviewCompact() {
  const { originName, destinationName, backgroundImage } = useWidgetPreviewRoute()

  return (
    <View style={styles.compactContainer}>
      <Image source={backgroundImage} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.darkOverlay} />

      <View style={styles.compactContent}>
        {/* Top: Station & Destination */}
        <View>
          <Text style={styles.compactStationName} numberOfLines={1}>
            {originName}
          </Text>
          <View style={styles.destinationRow}>
            <View style={styles.arrowCircle}>
              <Image source={arrowIcon} style={styles.arrowIcon} />
            </View>
            <Text style={styles.destinationText} numberOfLines={1}>
              {destinationName}
            </Text>
          </View>
        </View>

        {/* Middle: Next Train Label & Time */}
        <View style={styles.compactMiddleSection}>
          <Text style={styles.trainLabel} numberOfLines={1}>
            {translate("settings.widgetPreviewNextTrain")}
          </Text>
          <Text style={styles.compactTrainTime}>08:15</Text>
        </View>

        {/* Bottom: Platform ‧ Train */}
        <View style={styles.bottomInfoRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {translate("settings.widgetPreviewPlatform", { num: 2 })}
          </Text>
          <Text style={styles.dotSeparator}>‧</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {translate("settings.widgetPreviewTrain", { num: 124 })}
          </Text>
        </View>
      </View>
    </View>
  )
}
