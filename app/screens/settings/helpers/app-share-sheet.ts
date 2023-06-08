import { Platform } from "react-native"
import Share, { ShareOptions } from "react-native-share"
import { translate } from "../../../i18n"

export function shareApp() {
  const url = "https://better-rail.co.il/"
  const title = "Better Rail"
  const message = translate("settings.shareMessage")

  const shareOptions = Platform.select<ShareOptions>({
    ios: {
      activityItemSources: [
        {
          placeholderItem: { type: "url", content: url },
          item: {
            default: { type: "text", content: `${message} ${url}` },
          },
          subject: {
            default: title,
          },
          linkMetadata: { title: message },
        },
      ],
    },
    android: {
      title,
      subject: title,
      message: `${message} ${url}`,
    },
  })

  Share.open(shareOptions)
}
