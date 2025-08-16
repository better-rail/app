import { mock } from "bun:test"

// Mock React Native to avoid Flow type issues
mock.module("react-native", () => ({
  Platform: {
    OS: "ios",
    select: (obj: any) => obj.ios || obj.default,
  },
  Dimensions: {
    get: mock(() => ({ width: 375, height: 812 })),
    addEventListener: mock(),
    removeEventListener: mock(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  Image: "Image",
  Alert: {
    alert: mock(),
  },
  Linking: {
    openURL: mock(),
    canOpenURL: mock(() => Promise.resolve(true)),
  },
  AppState: {
    currentState: "active",
    addEventListener: mock(),
    removeEventListener: mock(),
  },
  NativeModules: {},
  NativeEventEmitter: mock(),
  I18nManager: {
    isRTL: false,
    doLeftAndRightSwapInRTL: false,
    allowRTL: mock(),
    forceRTL: mock(),
  },
}))
