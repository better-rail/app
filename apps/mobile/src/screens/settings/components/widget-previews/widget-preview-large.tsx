import React from "react"
import { Image, View } from "react-native"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { useWidgetPreviewRoute } from "./use-widget-preview-route"
import { styles } from "./widget-preview.styles"

const arrowIcon = require("../../../../../assets/arrow-left.png")

const UPCOMING_SCHEDULE = [
  { depart: "06:55", arrive: "07:29", duration: 34, platform: "2", train: "257" },
  { depart: "07:18", arrive: "07:44", duration: 26, platform: "3", train: "521" },
  { depart: "07:41", arrive: "08:22", duration: 41, platform: "2", train: "259" },
  { depart: "08:05", arrive: "08:31", duration: 26, platform: "3", train: "971" },
]

export function WidgetPreviewLarge() {
  const { originName, destinationName, backgroundImage } = useWidgetPreviewRoute()

  return (
    <View style={styles.largeContainer}>
      {/* Top Hero Section */}
      <View style={styles.largeHeroSection}>
        <Image source={backgroundImage} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.darkOverlay} />

        <View style={styles.largeHeroContent}>
          {/* Station & Destination */}
          <Text style={styles.largeStationName} numberOfLines={1}>
            {originName}
          </Text>
          <View style={styles.largeDestinationRow}>
            <View style={styles.arrowCircle}>
              <Image source={arrowIcon} style={styles.arrowIcon} />
            </View>
            <Text style={styles.destinationText} numberOfLines={1}>
              {destinationName}
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* NEXT TRAIN Header */}
          <Text style={styles.largeTrainLabel} numberOfLines={1}>
            {translate("settings.widgetPreviewNextTrain")}
          </Text>

          {/* Metrics Row */}
          <View style={styles.largeMetricsRow}>
            <Text style={styles.largeTrainTime}>06:32</Text>

            <View style={styles.largeMetricCol}>
              <Text style={styles.largeMetricLabel} numberOfLines={1}>
                {translate("settings.widgetPreviewArrival")}
              </Text>
              <Text style={styles.largeMetricVal} numberOfLines={1}>
                06:58
              </Text>
            </View>

            <View style={styles.largeMetricCol}>
              <Text style={styles.largeMetricLabel} numberOfLines={1}>
                {translate("settings.widgetPreviewPlatformHeader")}
              </Text>
              <Text style={styles.largeMetricVal} numberOfLines={1}>
                1
              </Text>
            </View>

            <View style={styles.largeMetricCol}>
              <Text style={styles.largeMetricLabel} numberOfLines={1}>
                {translate("settings.widgetPreviewTrainHeader")}
              </Text>
              <Text style={styles.largeMetricVal} numberOfLines={1}>
                261
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Schedule Table Section */}
      <View style={styles.largeScheduleSection}>
        {/* Table Column Headers */}
        <View style={styles.largeTableHeader}>
          <Text style={[styles.largeColHeader, styles.colDepart]} numberOfLines={1}>
            {translate("settings.widgetPreviewDepart")}
          </Text>
          <Text style={[styles.largeColHeader, styles.colArrive]} numberOfLines={1}>
            {translate("settings.widgetPreviewArrive")}
          </Text>
          <Text style={[styles.largeColHeader, styles.colDuration]} numberOfLines={1}>
            {translate("settings.widgetPreviewDuration")}
          </Text>
          <Text style={[styles.largeColHeader, styles.colPlatform]} numberOfLines={1}>
            {translate("settings.widgetPreviewPlatformHeader")}
          </Text>
          <Text style={[styles.largeColHeader, styles.colTrain, styles.largeColHeaderEnd]} numberOfLines={1}>
            {translate("settings.widgetPreviewTrainHeader")}
          </Text>
        </View>

        {/* Schedule Rows */}
        {UPCOMING_SCHEDULE.map((item, idx) => (
          <React.Fragment key={idx}>
            <View style={styles.largeDivider} />
            <View style={styles.largeTableRow}>
              <Text style={[styles.largeRowDepart, styles.colDepart]} numberOfLines={1}>
                {item.depart}
              </Text>
              <Text style={[styles.largeRowArrive, styles.colArrive]} numberOfLines={1}>
                {item.arrive}
              </Text>
              <Text style={[styles.largeRowDuration, styles.colDuration]} numberOfLines={1}>
                {translate("settings.widgetPreviewDurationMin", { num: item.duration })}
              </Text>
              <Text style={[styles.largeRowPlatform, styles.colPlatform]} numberOfLines={1}>
                {item.platform}
              </Text>
              <Text style={[styles.largeRowTrain, styles.colTrain]} numberOfLines={1}>
                {item.train}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  )
}
