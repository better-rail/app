export const platformPrefix = "conductor:platform:"
export const platforms = [
  { id: "ios", name: "ios", label: "אייפון", emoji: "🍎" },
  { id: "android", name: "android", label: "אנדרואיד", emoji: "🤖" },
]
export function welcomeMessage() {
  const picker = platformPicker()
  return {
    ...picker,
    content: "## ברוכים הבאים לדיסקורד של בטר רייל!\n\n" + picker.content,
  }
}

export function platformPicker() {
  return {
    content: "עם מה אתם נוסעים, אייפון או אנדרואיד?",
    components: [
      {
        type: 1,
        components: platforms.map((platform) => ({
          type: 2,
          style: 1,
          label: platform.label,
          emoji: { name: platform.emoji },
          custom_id: platformPrefix + platform.id,
        })),
      },
    ],
  }
}

export function journeyComplete() {
  return {
    content:
      "## תודה רבה! 🙏\nאם יש לכם פידבק, רעיון או דיווח על באג, אנא השאירו אותו ב- <#1548778686671757373>\n\nלכל דבר אחר דברו איתנו ב- <#1548778257866817626>\n\nשתהיה נסיעה טובה 🚂",
    components: [],
  }
}
