import { useEffect } from "react"
import { Ride } from "../models/ride/ride"
import { StackNavigationProp } from "@react-navigation/stack"
import { PrimaryParamList } from "../navigators"

export function useRideRerender(ride: Ride, navigation: StackNavigationProp<PrimaryParamList>) {
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("focus!")
      /**
       * manually trigger a re-render when the screen is in focus
       *
       * this is for the screen to re-render when the user navigates back to it from their previous state
       * and the user has started the ride, so the route card will be highlighted
       */
      //

      ride.id
    })

    return unsubscribe
  }, [navigation, ride.id])
}
