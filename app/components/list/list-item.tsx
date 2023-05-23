import { ReactNode, useMemo, useState } from "react"
import { Pressable, PressableProps, View, ViewStyle } from "react-native"
import { color } from "../../theme"
import { Text } from "../text/text"
import { TouchableHighlight } from "react-native-gesture-handler"

const LIST_ITEM_WRAPPER: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 12,
  backgroundColor: color.tertiaryBackground,
}

const FIRST_ITEM: ViewStyle = { borderRadius: 14, borderBottomStartRadius: 0, borderBottomEndRadius: 0 }
const LAST_ITEM: ViewStyle = { borderRadius: 14, borderTopStartRadius: 0, borderTopEndRadius: 0 }

const LIST_ITEM_SEPARATOR: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: color.separator,
}

export interface ListItemProps {
  title: string | ReactNode
  subtitle?: string | ReactNode
  isFirstItem?: boolean
  isLastItem?: boolean
  startBoxItem?: ReactNode
  endBoxItem?: ReactNode
  onPress?: () => void
}

export const ListItem = (props: ListItemProps) => {
  const { title, subtitle, isLastItem, isFirstItem, onPress, startBoxItem, endBoxItem } = props

  const touchableStyle = useMemo(() => {
    const baseStyle = [LIST_ITEM_WRAPPER]

    if (isFirstItem) baseStyle.push(FIRST_ITEM)
    if (isLastItem) baseStyle.push(LAST_ITEM)

    return baseStyle
  }, [isFirstItem, isLastItem])

  return (
    <TouchableHighlight underlayColor={color.inputPlaceholderBackground} onPress={onPress} style={touchableStyle}>
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: subtitle ? 6 : 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {startBoxItem && <View style={{ marginEnd: 6 }}>{startBoxItem}</View>}

            <View>
              {typeof title === "string" ? <Text style={{ fontSize: 18 }}>{title}</Text> : <>{title}</>}

              {subtitle && <Text>{subtitle}</Text>}
            </View>
          </View>

          {endBoxItem}
        </View>

        {!isLastItem && (
          <View style={{ paddingStart: startBoxItem ? 48 : 0 }}>
            <View style={LIST_ITEM_SEPARATOR} />
          </View>
        )}
      </View>
    </TouchableHighlight>
  )
}
