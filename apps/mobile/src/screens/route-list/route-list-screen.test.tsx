import { afterEach, beforeEach, describe, expect, mock, setSystemTime, spyOn, test } from "bun:test"
import React from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
import { QueryClient, setLogger } from "react-query/core"
import { Platform, View } from "react-native"
import { getE2ERoutes } from "@/services/api/e2e-route-fixtures"
import { routeListDayQueryKey, type RouteData } from "./route-list-query"

const friday = new Date(2026, 9, 9, 9, 11)
const sundayRoutes = getE2ERoutes("1600", "3100", "2026-10-11", "04:40")
const queryKey = routeListDayQueryKey("1600", "3100", friday.getTime(), false)
const post = mock()
const alert = mock()
// Bun resolves the web batching host; the app uses React Native's equivalent.
mock.module("react-dom", () => ({ default: { unstable_batchedUpdates: (callback: () => void) => callback() } }))
const { QueryClientProvider }: typeof import("react-query") = require("react-query")

// Replace native hosts and unrelated screen features; keep the screen, stores,
// date search, query cache, warning and date header connected as in the app.
mock.module("@/services/api/rail-api", () => ({ railApi: { axiosInstance: { post } } }))
mock.module("burnt", () => ({ alert }))
mock.module("expo-router", () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: mock() }),
  useLocalSearchParams: () => ({ originId: "1600", destinationId: "3100", time: String(friday.getTime()), enableQuery: "true" }),
  Stack: { Toolbar: Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, { View: "ToolbarView" }) },
  Redirect: () => null,
}))
mock.module("expo-glass-effect", () => ({ GlassView: "GlassView" }))
mock.module("@/utils/liquid-glass", () => ({ isLiquidGlassSupported: true }))
mock.module("react-native-unistyles", () => ({ StyleSheet: { create: () => ({}) } }))
mock.module("@/theme", () => ({ color: { primary: "blue" }, fontScale: 1, spacing: [2, 4, 8, 12, 16, 24, 32, 48, 64] }))
mock.module("@/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Text: ({ text, children, ...props }: { text?: string; children?: React.ReactNode }) =>
    React.createElement("Text", props, text ?? children),
  RouteDetailsHeader: () => null,
  RouteCard: "RouteCard",
  Button: "Button",
}))
mock.module("expo-network", () => ({ useNetworkState: () => ({ isInternetReachable: true }) }))
mock.module("expo-observe", () => ({ useObserve: () => ({ markInteractive: mock() }) }))
mock.module("react-native-reanimated", () => ({ useSharedValue: (value: number) => ({ value }) }))
mock.module("react-native-haptic-feedback", () => ({ default: { trigger: mock() } }))
mock.module("posthog-react-native", () => ({ useFeatureFlag: () => false }))
mock.module("@/services/analytics", () => ({ setAnalyticsUserProperty: mock(), setAnalyticsUserProperties: mock() }))
mock.module("@expo/react-native-action-sheet", () => ({ useActionSheet: () => ({ showActionSheetWithOptions: mock() }) }))
mock.module("@/utils/helpers/route-share-helpers", () => ({ shareRouteAction: mock() }))
mock.module("@/utils/helpers/calendar-helpers", () => ({ addRouteToCalendar: mock() }))
mock.module("@/utils/helpers/action-sheet-helpers", () => ({ getActionSheetStyleOptions: () => ({}) }))
mock.module("@/utils/hour-index", () => ({ isHourIndexSupported: () => false }))

const { RouteApi }: typeof import("@/services/api/route-api") = require("@/services/api/route-api")
const {
  useTrainRoutesStore,
  resetTrainRoutesStore,
}: typeof import("@/models/train-routes/train-routes") = require("@/models/train-routes/train-routes")
const {
  useSettingsStore,
  resetSettingsStore,
}: typeof import("@/models/settings/settings") = require("@/models/settings/settings")
const {
  useRoutePlanStore,
  resetRoutePlanStore,
}: typeof import("@/models/route-plan/route-plan") = require("@/models/route-plan/route-plan")
mock.module("@/models", () => ({
  useTrainRoutesStore,
  useSettingsStore,
  useRoutePlanStore,
  useRideStore: (selector: (state: { route: null; isRouteActive: () => boolean }) => unknown) =>
    selector({ route: null, isRouteActive: () => false }),
}))
const { RouteListWarning }: typeof import("./components/route-list-warning") = require("./components/route-list-warning")
const { ResultDateCard }: typeof import("./components/result-date-card") = require("./components/result-date-card")
mock.module("./components", () => ({
  RouteListWarning,
  ResultDateCard,
  RouteListError: "RouteListError",
  NoTrainsFoundMessage: "NoTrainsFoundMessage",
  FilteredTrainsMessage: "FilteredTrainsMessage",
  DateScroll: () => null,
  HourIndexBar: () => null,
  HOUR_INDEX_MAX_FONT_SCALE: 1.5,
}))
function TestFlashList(props: { data: RouteData[]; renderItem: (props: { item: RouteData; index: number }) => React.ReactNode }) {
  return (
    <View>
      {props.data.map((item, index) => (
        <React.Fragment key={index}>{props.renderItem({ item, index })}</React.Fragment>
      ))}
    </View>
  )
}
mock.module("@shopify/flash-list", () => ({ FlashList: TestFlashList }))
const { RouteListScreen }: typeof import("./route-list-screen") = require("./route-list-screen")
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let client: QueryClient
let renderer: ReactTestRenderer | undefined
let timetable: ReturnType<typeof spyOn> | undefined
let errorLog: ReturnType<typeof spyOn>

beforeEach(() => {
  setSystemTime(friday)
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true })
  resetTrainRoutesStore()
  resetSettingsStore()
  useRoutePlanStore.setState({ date: friday, dateType: "departure" })
  useSettingsStore.setState({ seenTrainInfoPrompt: true })
  post.mockReset()
  alert.mockClear()
  errorLog = spyOn(console, "error").mockImplementation(() => {})
  setLogger({ log: console.log, warn: console.warn, error: () => {} })
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, cacheTime: Infinity, retry: false } } })
})

afterEach(async () => {
  await act(() => renderer?.unmount())
  renderer = undefined
  timetable?.mockRestore()
  timetable = undefined
  client.clear()
  resetTrainRoutesStore()
  resetSettingsStore()
  resetRoutePlanStore()
  errorLog.mockRestore()
  setLogger(console)
  setSystemTime()
})

async function renderScreen() {
  await act(() => {
    renderer = create(
      <QueryClientProvider client={client}>
        <RouteListScreen />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await Bun.sleep(0)
  })
}

function expectSundayWarning() {
  const warning = renderer!.root.findByType(RouteListWarning)
  expect(warning.props).toMatchObject({
    requestedTime: friday.getTime(),
    routesDate: sundayRoutes[0].departureTime,
    warningType: "different-date",
  })
  expect(renderer!.root.findByProps({ testID: "route-list-warning" })).toBeDefined()
  expect(renderer!.root.findByProps({ testID: "route-results-date" })).toBeDefined()
  const list = renderer!.root.findByType(TestFlashList)
  expect(list.props.data[list.props.initialScrollIndex]).toBe(new Date(sundayRoutes[0].departureTime).toDateString())
  expect(list.props.stickyHeaderIndices).toEqual([0])
}

describe("Friday search with Sunday trains", () => {
  test.each(["fresh", "cached"])("%s results show the date warning and keep it through refreshes", async (source) => {
    timetable = spyOn(RouteApi.prototype, "getRoutes").mockImplementation(async (_origin, _destination, date) =>
      date === "2026-10-11" ? sundayRoutes : [],
    )
    if (source === "cached") {
      await client.fetchQuery(queryKey, () => useTrainRoutesStore.getState().getRoutes("1600", "3100", friday.getTime()))
    }
    await renderScreen()
    expectSundayWarning()
    expect(alert).not.toHaveBeenCalled()

    await act(async () => {
      await client.refetchQueries(queryKey, { exact: true })
      await Bun.sleep(0)
    })
    expectSundayWarning()
    await act(async () => {
      await Bun.sleep(650)
    })
    expect(alert).toHaveBeenCalledTimes(1)
    expectSundayWarning()

    let rejectRefresh!: (error: Error) => void
    timetable.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRefresh = reject
        }),
    )
    let refresh!: Promise<void>
    await act(async () => {
      refresh = client.refetchQueries(queryKey, { exact: true }, { throwOnError: true })
      await Bun.sleep(0)
    })
    expectSundayWarning()
    const error = new Error("Offline")
    await act(async () => {
      rejectRefresh(error)
      await expect(refresh).rejects.toBe(error)
      await Bun.sleep(0)
    })
    expectSundayWarning()
    expect(alert).toHaveBeenCalledTimes(1)
  })

  test("a network failure shows a request error instead of searching another date", async () => {
    post.mockRejectedValue(new Error("Offline"))
    await renderScreen()
    expect(renderer!.root.findByProps({ errorType: "request-error" })).toBeDefined()
    expect(renderer!.root.findAllByProps({ testID: "route-list-warning" })).toHaveLength(0)
    expect(post).toHaveBeenCalledTimes(1)
  })
})
