import { Image, View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import TouchableScale from "react-native-touchable-scale"
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated"

const CHECKMARK = require("../../../assets/checkmark.png")

interface StationListItemProps {
  title: string
  image: any
  selected?: boolean
  onSelect?: () => void
  style?: ViewStyle
}

export function StationListItem(props: StationListItemProps) {
  const { title, image, selected, onSelect, style } = props

  return (
    <TouchableScale style={[styles.wrapper, style]} activeScale={0.97} friction={10} onPress={onSelect}>
      <View style={styles.imageWrapper}>
        {selected && (
          <Animated.Image
            source={CHECKMARK}
            style={styles.checkmarkImage}
            entering={ZoomIn.duration(150)}
            exiting={ZoomOut.duration(150)}
          />
        )}
        <Image source={image} style={[styles.stationImage, selected && { borderWidth: 3 }]} blurRadius={selected ? 10 : 0} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableScale>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
    borderRadius: 50,
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  stationImage: {
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  checkmarkImage: {
    position: "absolute",
    right: 7.5,
    top: 7.5,
    width: 25,
    height: 25,
    borderRadius: 50,
    zIndex: 1,
    tintColor: theme.colors.whiteText,
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
  },
}))
