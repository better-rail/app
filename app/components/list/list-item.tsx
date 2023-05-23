import { ReactNode } from "react"
import { View, ViewStyle } from "react-native"
import { color } from "../../theme"
import { Text } from "../text/text"

const LIST_ITEM_WRAPPER: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 12,
  borderRadius: 14,
  backgroundColor: color.tertiaryBackground,
}

const LIST_ITEM_SEPARATOR: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: color.separator,
}

interface ListItemProps {
  title: string
  subtitle?: string | ReactNode

  startBoxItem?: ReactNode
}

export const ListItem = (props: ListItemProps) => {
  const { title, subtitle, startBoxItem } = props
  return (
    <View style={LIST_ITEM_WRAPPER}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {startBoxItem && <View style={{ marginEnd: 6 }}>{startBoxItem}</View>}

        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 18 }}>{title}</Text>
          {subtitle && <Text>{subtitle}</Text>}
        </View>
      </View>

      <View style={{ paddingStart: startBoxItem ? 48 : 0 }}>
        <View style={LIST_ITEM_SEPARATOR} />
      </View>
    </View>
  )
}
