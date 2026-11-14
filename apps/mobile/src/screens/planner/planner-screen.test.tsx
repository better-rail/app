import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import React from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
import { QueryClient, setLogger } from "react-query/core"
import { Platform } from "react-native"

const push = mock()
const donateRouteIntent = mock()

// Bun shares module mocks across test files, so spread the real modules and only override what the
// screen needs; replace native hosts and unrelated UI, keeping the screen and route plan store connected.
// Bun resolves the web batching host; the app uses React Native's equivalent.
mock.module("react-dom", () => ({ default: { unstable_batchedUpdates: (callback: () => void) => callback() } }))
const { QueryClientProvider }: typeof import("react-query") = require("react-query")
const i18n: typeof import("@/i18n") = require("@/i18n")
const stationsData: typeof import("@/data/stations") = require("@/data/stations")
const iosHelpers: typeof import("@/utils/ios-helpers") = require("@/utils/ios-helpers")
const analytics: typeof import("@/services/analytics") = require("@/services/analytics")
mock.module("expo-router", () => ({
  useRouter: () => ({ push }),
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  Stack: { Toolbar: Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, { View: "ToolbarView" }) },
  Redirect: () => null,
}))
mock.module("expo-observe", () => ({ useObserve: () => ({ markInteractive: mock() }) }))
mock.module("@/hooks", () => ({ useMountEffect: () => {} }))
mock.module("react-native-unistyles", () => ({
  StyleSheet: { create: () => ({}) },
  useUnistyles: () => ({ theme: { colors: { primary: "blue" } } }),
}))
mock.module("react-native-haptic-feedback", () => ({ default: { trigger: mock() } }))
mock.module("@/theme", () => ({ color: { primary: "blue" }, fontScale: 1, spacing: [2, 4, 8, 12, 16, 24, 32, 48, 64] }))
mock.module("@/data/stations", () => ({ ...stationsData, useStations: () => [{ id: "1600", name: "Tel Aviv" }] }))
mock.module("@/i18n", () => ({ ...i18n, useFormattedDate: () => i18n.translate("plan.now") }))
mock.module("@/utils/ios-helpers", () => ({ ...iosHelpers, donateRouteIntent }))
mock.module("@/services/analytics", () => ({ ...analytics, trackEvent: mock() }))
mock.module("@/components/theme-background/theme-background", () => ({ ThemeBackground: () => null }))
mock.module("./planner-screen-header", () => ({ PlannerScreenHeader: () => null }))
mock.module("./planner-slider-wrapper", () => ({
  FlingGestureWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
mock.module("./use-station-swap", () => ({
  useStationSwap: () => ({
    swap: mock(),
    upper: { type: "origin", style: {}, onLayout: mock() },
    lower: { type: "destination", style: {}, onLayout: mock() },
  }),
}))
mock.module("@/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: "Button",
  Text: "Text",
  StationCard: "StationCard",
  DummyInput: "DummyInput",
  ChangeDirectionButton: "ChangeDirectionButton",
  ResetTimeButton: "ResetTimeButton",
  DatePickerModal: "DatePickerModal",
  WebsiteHomeHandoff: () => null,
  // Used by the route list screen, which shares this module mock in the same Bun run.
  RouteDetailsHeader: () => null,
  WebsiteHandoff: () => null,
  RouteCard: "RouteCard",
  RouteCardHeight: 75,
  RouteCardHeightWithHeader: 95,
}))

const { useTrainRoutesStore }: typeof import("@/models/train-routes/train-routes") = require("@/models/train-routes/train-routes")
const { useSettingsStore }: typeof import("@/models/settings/settings") = require("@/models/settings/settings")
const {
  useRoutePlanStore,
  resetRoutePlanStore,
  useDateTypeDisplayName,
}: typeof import("@/models/route-plan/route-plan") = require("@/models/route-plan/route-plan")
mock.module("@/models", () => ({
  useTrainRoutesStore,
  useSettingsStore,
  useRoutePlanStore,
  useDateTypeDisplayName,
  useRideStore: (selector: (state: { route: null; isRouteActive: () => boolean }) => unknown) =>
    selector({ route: null, isRouteActive: () => false }),
}))
const { PlannerScreen }: typeof import("./planner-screen") = require("./planner-screen")
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let client: QueryClient
const realGetRoutes = useTrainRoutesStore.getState().getRoutes
let renderer: ReactTestRenderer | undefined

function render() {
  act(() => {
    renderer = create(
      <QueryClientProvider client={client}>
        <PlannerScreen />
      </QueryClientProvider>,
    )
  })
  return renderer!.root.findByProps({ testID: "find-routes-button" })
}

beforeEach(() => {
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true })
  setLogger({ log: () => {}, warn: () => {}, error: () => {} })
  client = new QueryClient()
  resetRoutePlanStore()
  // The screen prefetches routes once both stations are set; keep that off the network.
  useTrainRoutesStore.setState({ getRoutes: mock(() => Promise.resolve([])) } as never)
  push.mockClear()
  donateRouteIntent.mockClear()
})

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = undefined
  client.clear()
  useTrainRoutesStore.setState({ getRoutes: realGetRoutes })
})

describe("PlannerScreen without picked stations", () => {
  const cases = [
    { name: "no stations", origin: undefined, destination: undefined },
    { name: "only an origin", origin: { id: "1600", name: "Tel Aviv" }, destination: undefined },
    { name: "only a destination", origin: undefined, destination: { id: "1600", name: "Tel Aviv" } },
  ]

  for (const { name, origin, destination } of cases) {
    test(`renders and ignores the find button with ${name}`, () => {
      useRoutePlanStore.setState({ origin, destination })
      const button = render()

      expect(button.props.disabled).toBe(true)
      expect(() => act(() => button.props.onPress())).not.toThrow()
      expect(push).not.toHaveBeenCalled()
      expect(donateRouteIntent).not.toHaveBeenCalled()
    })
  }

  test("navigates to the route list once both stations are picked", () => {
    useRoutePlanStore.setState({ origin: { id: "1600", name: "A" }, destination: { id: "3100", name: "B" } })
    const button = render()

    expect(button.props.disabled).toBe(false)
    act(() => button.props.onPress())
    expect(donateRouteIntent).toHaveBeenCalledWith("1600", "3100")
    expect(push).toHaveBeenCalledTimes(1)
  })
})
