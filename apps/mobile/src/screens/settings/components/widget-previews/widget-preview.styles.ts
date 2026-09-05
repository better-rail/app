import { StyleSheet } from "react-native-unistyles"

export const COMPACT_CARD_SIZE = 140
export const WIDE_CARD_HEIGHT = 140

const shadowMedium = {
  textShadowColor: "rgba(0, 0, 0, 0.9)",
  textShadowOffset: { width: 1.5, height: 1.5 },
  textShadowRadius: 3,
}

const shadowLarge = {
  textShadowColor: "rgba(0, 0, 0, 0.95)",
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 5,
}

export const styles = StyleSheet.create((theme, rt) => ({
  compactContainer: {
    width: COMPACT_CARD_SIZE,
    height: COMPACT_CARD_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#16181D",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  wideContainer: {
    width: "100%",
    maxWidth: 316,
    height: WIDE_CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#16181D",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Android #BF000000 is 75% black (0xBF = 191 / 255 = 0.75)
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },

  // --- Compact (2x2) Layout ---
  compactContent: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  compactStationName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  arrowCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    width: 8,
    height: 8,
    tintColor: "#000000",
    transform: rt.rtl ? undefined : [{ rotate: "180deg" }],
  },
  destinationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.typography.primary,
    flexShrink: 1,
    ...shadowMedium,
  },
  compactMiddleSection: {
    justifyContent: "flex-end",
    marginVertical: 2,
  },
  trainLabel: {
    // Android #FFFF9999 -> salmon header
    color: "#FF9999",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    letterSpacing: 0.5,
    marginBottom: 1,
    ...shadowMedium,
  },
  compactTrainTime: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    lineHeight: 32,
    ...shadowLarge,
  },
  bottomInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    // Android #FFB6B9BA -> light gray
    color: "#B6B9BA",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },
  dotSeparator: {
    color: "#B6B9BA",
    fontSize: 10,
    fontWeight: "bold",
    marginHorizontal: 5,
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },

  // --- Wide (4x2) Layout ---
  wideContent: {
    flex: 1,
    flexDirection: "row",
    padding: 10,
  },
  wideLeftCol: {
    flex: 1.25,
    height: "100%",
    justifyContent: "space-between",
  },
  wideTimesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wideTrainTime: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    lineHeight: 32,
    ...shadowLarge,
  },
  arrivalCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  arrivalLabel: {
    // Android #FF727378 -> muted gray
    color: "#727378",
    fontSize: 9,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    letterSpacing: 0.5,
    ...shadowMedium,
  },
  arrivalTime: {
    color: "#727378",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },
  wideDivider: {
    width: 1,
    height: "88%",
    // Android #33FFFFFF -> 20% white
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
    alignSelf: "center",
  },
  wideRightCol: {
    flex: 0.95,
    height: "100%",
    paddingStart: 6,
  },
  upcomingHeader: {
    // Android #FF878892 -> medium gray
    color: "#878892",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 6,
    ...shadowMedium,
  },
  upcomingList: {
    gap: 4,
  },
  upcomingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upcomingDeparture: {
    // Android #FFCCCCCC -> silver
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },
  upcomingArrival: {
    color: "#727378",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: theme.typography.primary,
    ...shadowMedium,
  },
}))
