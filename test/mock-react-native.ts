import { mock } from "bun:test"

// Mock React Native to avoid Flow type issues
mock.module("react-native", () => {
  // Minimal Touchable mixin so libraries depending on it do not blow up in tests
  const touchableMixin = {
    touchableHandleStartShouldSetResponder: () => false,
    touchableHandleResponderTerminationRequest: () => true,
    touchableHandleResponderGrant: () => {},
    touchableHandleResponderMove: () => {},
    touchableHandleResponderRelease: () => {},
    touchableHandleResponderTerminate: () => {},
    touchableGetInitialState: () => ({ isHighlighted: false, touchable: null }),
    touchableHandlePress: () => {},
    touchableHandleActivePressIn: () => {},
    touchableHandleActivePressOut: () => {},
    touchableHandleLongPress: () => {},
    touchableGetPressRectOffset: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
    touchableGetHitSlop: () => null,
    touchableGetHighlightDelayMS: () => 0,
    touchableGetLongPressDelayMS: () => 0,
    touchableGetPressOutDelayMS: () => 0,
  }

  return {
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
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
    Alert: {
      alert: mock(),
    },
    Linking: {
      openURL: mock(),
      canOpenURL: mock(() => Promise.resolve(true)),
    },
    processColor: (color: string) => color,
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
    Touchable: {
      Mixin: touchableMixin,
    },
  }
})

mock.module("react-native/Libraries/Utilities/codegenNativeComponent", () => ({
  __esModule: true,
  default: () => ({}),
}))

mock.module("react-native-restart-newarch", () => ({
  __esModule: true,
  default: {
    Restart: mock(),
    restart: mock(),
  },
}))
