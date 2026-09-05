import { ReactNode } from "react"
import { TouchableHighlight, View, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { color } from "@/theme"
import { Text } from "@/components/text/text"

export interface ListItemProps {
  title: string | ReactNode
  subtitle?: string | ReactNode
  isFirstItem?: boolean
  isLastItem?: boolean
  startBoxItem?: ReactNode
  endBoxItem?: ReactNode
  onPress?: () => void
  contentStyle?: ViewStyle
}

export const ListItem = (props: ListItemProps) => {
  const { title, subtitle, isLastItem, isFirstItem, onPress, startBoxItem, endBoxItem } = props

  const touchableStyle = [styles.listItemWrapper, isFirstItem && styles.firstItem, isLastItem && styles.lastItem]

  return (
    <TouchableHighlight underlayColor={color.inputPlaceholderBackground} onPress={onPress} style={touchableStyle}>
      <View>
        <View style={[styles.row, styles.rowSpaceBetween, styles.rowPaddingBottom(!!subtitle)]}>
          <View style={styles.row}>
            {startBoxItem && <View style={styles.startBox}>{startBoxItem}</View>}

            <View style={props.contentStyle}>
              {typeof title === "string" ? <Text style={styles.title}>{title}</Text> : <>{title}</>}

              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>

          {endBoxItem}
        </View>
        {!isLastItem && (
          <View style={styles.separatorWrapper(!!startBoxItem)}>
            <View style={styles.listItemSeparator} />
          </View>
        )}
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create((theme) => ({
  listItemWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: theme.colors.tertiaryBackground,
  },
  firstItem: { borderRadius: 14, borderBottomStartRadius: 0, borderBottomEndRadius: 0 },
  lastItem: {
    paddingBottom: 2,
    borderRadius: 14,
    borderTopStartRadius: 0,
    borderTopEndRadius: 0,
  },
  listItemSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
    opacity: 0.9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowSpaceBetween: {
    justifyContent: "space-between",
  },
  rowPaddingBottom: (hasSubtitle: boolean) => ({
    paddingBottom: hasSubtitle ? 6 : 12,
  }),
  startBox: {
    marginEnd: 6,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    color: theme.colors.grey,
  },
  separatorWrapper: (hasStartBox: boolean) => ({
    paddingStart: hasStartBox ? 48 : 0,
  }),
}))
