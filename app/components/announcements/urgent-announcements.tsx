import React from "react"
import { View, ViewStyle } from "react-native"
import { useQuery } from "react-query"
import { userLocale } from "../../i18n"
import { PopUpMessage, railApi } from "../../services/api"
import { color, spacing } from "../../theme"
import { Text } from "../text/text"
import { Screen } from "../screen/screen"
import { format, parseISO } from "date-fns"

export const UrgentAnnouncements = () => {
  const { data: messages } = useQuery<PopUpMessage[]>(["announcements", "urgent"], () => railApi.getPopupMessages(userLocale))

  return (
    <Screen unsafe statusBar="light-content">
      <Text style={{ fontSize: 48, textAlign: "center", marginVertical: spacing[4] }}>📣</Text>
      {messages.map((m) => (
        <MessageBox message={m} />
      ))}
    </Screen>
  )
}

const MESSAGE_BOX_WRAPPER: ViewStyle = {
  backgroundColor: color.tertiaryBackground,
  paddingVertical: spacing[2],
  paddingHorizontal: spacing[3],
  borderRadius: 6,
}

const MessageBox = ({ message }: { message: PopUpMessage }) => {
  return (
    <View style={{ marginHorizontal: spacing[3] }}>
      <Text style={{ color: color.dim }}>{format(parseISO(message.startDate), "do MMMM yyyy, HH:mm")}</Text>
      <View style={MESSAGE_BOX_WRAPPER}>
        <Text style={{ fontSize: 18 }}>{message.messageBody}</Text>
      </View>
    </View>
  )
}

// for mocking the UI
// const MessageBox = ({ message }: { message: PopUpMessage }) => {
//   return (
//     <View style={{ marginHorizontal: spacing[3] }}>
//       <Text style={{ color: color.dim }}>18th September 2023, 18:30</Text>
//       <View style={MESSAGE_BOX_WRAPPER}>
//         <Text style={{ fontSize: 18 }}>
//           Because of a an issue we stopped the train movement between Herzeliya and Tel Aviv stations. Lots of trouble incoming,
//           please use alternate public transportation.
//         </Text>
//       </View>
//     </View>
//   )
// }
