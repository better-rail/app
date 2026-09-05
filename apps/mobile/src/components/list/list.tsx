import React, { ReactNode } from "react"
import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { ListItemProps } from "./list-item"

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

  return <View style={styles.listWrapper}>{modifiedChildren}</View>
}

const styles = StyleSheet.create((theme) => ({
  listWrapper: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.tertiaryBackground,
  },
}))
