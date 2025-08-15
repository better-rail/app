package com.betterrail.widget.constants

/**
 * Constants for deeplink URLs and schemes
 */
object DeeplinkConstants {
    const val SCHEME = "betterrail"
    const val ROUTE_HOST = "route"
    const val PARAM_ORIGIN = "origin"
    const val PARAM_DESTINATION = "destination"
    
    /**
     * Creates a route deeplink URL
     * @param originId Origin station ID
     * @param destinationId Destination station ID
     * @return Formatted deeplink URL
     */
    fun createRouteDeeplink(originId: String, destinationId: String): String {
        return "$SCHEME://$ROUTE_HOST?$PARAM_ORIGIN=$originId&$PARAM_DESTINATION=$destinationId"
    }
}