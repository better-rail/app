import React from "react"
import { Image, View } from "react-native"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { useWidgetPreviewRoute } from "./use-widget-preview-route"
import { styles } from "./widget-preview.styles"

const arrowIcon = require("../../../../../assets/arrow-left.png")

export function WidgetPreviewWide() {
  const { originName, destinationName, backgroundImage } = useWidgetPreviewRoute()

  return (
    <View style={styles.wideContainer}>
      <Image source={backgroundImage} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.darkOverlay} />

      <View style={styles.wideContent}>
        {/* Left Section: Main Route & Next Train */}
        <View style={styles.wideLeftCol}>
          {/* Station & Destination */}
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

          {/* Next Train & Arrival Times */}
          <View>
            <Text style={styles.trainLabel} numberOfLines={1}>
              {translate("settings.widgetPreviewNextTrain")}
            </Text>
            <View style={styles.wideTimesRow}>
              <Text style={styles.wideTrainTime}>08:15</Text>
              <View style={styles.arrivalCol}>
                <Text style={styles.arrivalLabel}>{translate("settings.widgetPreviewArrival")}</Text>
                <Text style={styles.arrivalTime}>08:52</Text>
              </View>
            </View>
          </View>

          {/* Bottom Row: Platform ‧ Train */}
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

        {/* Separator Line */}
        <View style={styles.wideDivider} />

        {/* Right Section: Upcoming Trains */}
        <View style={styles.wideRightCol}>
          <Text style={styles.upcomingHeader} numberOfLines={1}>
            {translate("settings.widgetPreviewUpcoming")}
          </Text>

          <View style={styles.upcomingList}>
            <View style={styles.upcomingRow}>
              <Text style={styles.upcomingDeparture}>08:45</Text>
              <Text style={styles.upcomingArrival}>09:22</Text>
            </View>
            <View style={styles.upcomingRow}>
              <Text style={styles.upcomingDeparture}>09:15</Text>
              <Text style={styles.upcomingArrival}>09:52</Text>
            </View>
            <View style={styles.upcomingRow}>
              <Text style={styles.upcomingDeparture}>09:45</Text>
              <Text style={styles.upcomingArrival}>10:22</Text>
            </View>
            <View style={styles.upcomingRow}>
              <Text style={styles.upcomingDeparture}>10:15</Text>
              <Text style={styles.upcomingArrival}>10:52</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
