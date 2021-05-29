import React from "react"
import { observer } from "mobx-react-lite"
import { Image, TextStyle, View, ViewStyle } from "react-native"
import { Screen, Text, RouteDetails } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import TouchableScale from "react-native-touchable-scale"
import { FavoritesScreenProps } from "../../navigators"
import { FlatList } from "react-native-gesture-handler"
import { useStations } from "../../data/stations"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  padding: spacing[4],
  marginTop: spacing[3],
  flex: 1,
}

export const FavoritesScreen = observer(function FavoritesScreen({ navigation }: FavoritesScreenProps) {
  // Pull in one of our MST stores
  const { favoriteRoutes, routePlan } = useStores()
  const stations = useStations()

  const onFavoritePress = (originId, destinationId) => {
    const origin = stations.find((s) => s.id === originId)
    const destination = stations.find((s) => s.id === destinationId)

    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)

    navigation.goBack()
  }

  const renderFavoriteCard = ({ item }) => (
    <PressableRouteDetails
      originId={item.originId}
      destinationId={item.destinationId}
      onPress={() => onFavoritePress(item.originId, item.destinationId)}
    />
  )

  return (
    <Screen style={ROOT} unsafe={true} preset="fixed">
      <FlatList
        data={favoriteRoutes.routes}
        renderItem={renderFavoriteCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => <EmptyState />}
      />
    </Screen>
  )
})

const PressableRouteDetails = (props) => (
  <TouchableScale onPress={props.onPress} activeScale={0.97} friction={9} style={{ marginBottom: 30 }}>
    <RouteDetails
      originId={props.originId}
      destinationId={props.destinationId}
      imageStyle={{ borderRadius: 6, overflow: "hidden" }}
    />
  </TouchableScale>
)

const EMPTY_STATE_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginTop: spacing[2],
}

const EMPTY_STATE_TEXT: TextStyle = {
  color: color.dim,
}

const EmptyState = () => (
  <View style={EMPTY_STATE_WRAPPER}>
    <Image
      source={require("../../../assets/star.png")}
      style={{ width: 58, height: 55, marginBottom: spacing[2], tintColor: color.dim, opacity: 0.75 }}
    />
    <Text tx="favorites.empty" style={EMPTY_STATE_TEXT} />
    <Text tx="favorites.emptyDescription" preset="small" style={EMPTY_STATE_TEXT} />
  </View>
)
