import { Image, View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Path, Svg } from "react-native-svg"
import TouchableScale from "react-native-touchable-scale"
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated"
import { Text } from "@/components"
import { ContextMenu, type ContextMenuAction } from "@/components/context-menu/context-menu"
import { translate } from "@/i18n"
import { useIsDarkMode } from "@/hooks"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

const CHECKMARK = require("../../../assets/checkmark.png")

interface StationListItemProps {
  title: string
  subtitle?: string
  /** A third, quieter line under the subtitle. */
  detail?: string
  image: any
  selected?: boolean
  onSelect?: () => void
  /** Shown behind an edit button at the end of the row, as a menu, when given. */
  actions?: ContextMenuAction[]
  /** Lines the title may take; one by default. */
  titleLines?: number
  style?: ViewStyle
  testID?: string
}

/**
 * A station row: its photo (checked when selected), its name, what it is set to, and a menu of what
 * can be changed. The edit button sits beside the row's own touchable rather than inside it, so a
 * screen reader reaches both.
 */
export function StationListItem(props: StationListItemProps) {
  const { title, subtitle, detail, image, selected, onSelect, actions, titleLines = 1, style, testID } = props
  const spoken = [title, subtitle, detail].filter(Boolean).join(", ")

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableScale
        style={styles.main}
        activeScale={0.97}
        friction={10}
        onPress={onSelect}
        accessibilityRole={selected === undefined ? "button" : "checkbox"}
        accessibilityState={selected === undefined ? undefined : { checked: selected }}
        accessibilityLabel={spoken}
        testID={testID}
      >
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
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={titleLines}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} preset="small" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {detail && (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          )}
        </View>
      </TouchableScale>
      {actions && actions.length > 0 && (
        <ContextMenu mode="tap" actions={actions}>
          {/* A plain view, not a touchable: a touchable child would swallow the menu's tap. */}
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={translate("stationAlerts.edit") ?? undefined}
            testID={testID ? `${testID}-edit` : undefined}
          >
            {isLiquidGlassSupported ? (
              <GlassView isInteractive style={styles.edit}>
                <PencilGlyph />
              </GlassView>
            ) : (
              <View style={[styles.edit, styles.editPlain]}>
                <PencilGlyph />
              </View>
            )}
          </View>
        </ContextMenu>
      )}
    </View>
  )
}

/** A pencil, in the system blue of an editable thing. */
function PencilGlyph() {
  const isDark = useIsDarkMode()
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={isDark ? "#0A84FF" : "#007AFF"}
      />
    </Svg>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingStart: 12,
    paddingEnd: 10,
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    borderCurve: "continuous",
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "500",
  },
  subtitle: {
    color: theme.colors.label,
  },
  detail: {
    fontSize: 13,
    color: theme.colors.label,
  },
  // A 40pt target around the glyph, on a glass disc (a quiet one where there is no glass).
  edit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  editPlain: {
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
}))
