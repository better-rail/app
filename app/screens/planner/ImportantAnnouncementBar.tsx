// import { useEffect } from "react"
// import { TextStyle } from "react-native"
// import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated"
// import { color } from "../../theme"

// const TEXT_STYLE: TextStyle = {
//   color: color.text,
//   fontWeight: "bold",
//   textAlign: "left",
// }

// export function ImoprtantAnnouncementBar() {
//   const width = useSharedValue(0)
//   const opacity = useSharedValue(0)

//   const onStart = () => {
//     width.value = withSpring(1000, {
//       damping: 2,
//       stiffness: 1,
//     })

//     opacity.value = withDelay(650, withTiming(1, { duration: 400 }))
//   }

//   const a = useAnimatedStyle(() => {
//     return {
//       opacity: opacity.value,
//     }
//   })

//   const b = useAnimatedStyle(() => {
//     return {
//       // opacity: width.value,
//       width,
//     }
//   })

//   const onHide = () => {
//     width.value = 0
//     // opacity.value = 0
//   }

//   useEffect(() => {
//     onStart()
//     return onHide
//   })

//   return (
//     <Animated.View
//       style={{
//         height: 30,
//         justifyContent: "center",
//         paddingHorizontal: 10,
//         backgroundColor: "#e74c3c",
//         borderRadius: 10,
//       }}
//     >
//       <Animated.Text style={[TEXT_STYLE, a]}>הודעה חשובה מרכבת ישראל</Animated.Text>
//     </Animated.View>
//   )
// }
