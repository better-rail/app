import { View } from "react-native"
import { Train } from "../../services/api"
import { RouteStopCard } from "./components"
import { format } from "date-fns"
import { RouteLine } from "./route-details-screen"

interface RouteDetailsStaticRouteProps {
  train: Train
}

export function RouteDetailsStaticRoute({ train }: RouteDetailsStaticRouteProps) {
  return (
    <>
      {train.stopStations.length > 0
        ? train.stopStations.map((stop, index) => (
            <View key={stop.stationId}>
              <RouteStopCard
                stationName={stop.stationName}
                stopTime={format(stop.departureTime, "HH:mm")}
                delayedTime={train.delay ? format(stop.departureTime + train.delay * 60000, "HH:mm") : undefined}
                style={{ zIndex: 20 - index }}
                topLineState={"idle"}
                bottomLineState={"idle"}
              />
              {train.stopStations.length - 1 === index && <RouteLine state={"idle"} />}
            </View>
          ))
        : // if there are no stops, display a separating line between the route station cards
          train.stopStations.length === 0 && <RouteLine height={30} state="idle" />}
    </>
  )
}
