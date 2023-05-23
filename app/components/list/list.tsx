import React, { ReactNode } from "react"
import { ViewStyle, View } from "react-native"
import { color } from "../../theme"
import { ListItemProps } from "./list-item"

const LIST_WRAPPER: ViewStyle = {
  marginHorizontal: 16,
  borderRadius: 14,
  backgroundColor: color.tertiaryBackground,
}

type ListProps = {
  children: ReactNode
}

export const List = ({ children }: ListProps) => {
  const modifiedChildren = React.Children.map(children, (child, index) => {
    if (index === 0 && React.Children.count(children) > 0) {
      return React.cloneElement(child as React.ReactElement<ListItemProps>, {
        isFirstItem: true,
      })
    }

    if (index === React.Children.count(children) - 1) {
      return React.cloneElement(child as React.ReactElement<ListItemProps>, {
        isLastItem: true,
      })
    }

    return child
  })

  return <View style={LIST_WRAPPER}>{modifiedChildren}</View>
}
