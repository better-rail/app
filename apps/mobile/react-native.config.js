// react-native-date-picker is only used on Android (date-picker-modal.android.tsx), and its iOS
// sources don't compile against RN 0.88's prebuilt React headers.
module.exports = {
  dependencies: {
    "react-native-date-picker": { platforms: { ios: null } },
  },
}
