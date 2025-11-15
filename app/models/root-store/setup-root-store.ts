import { onSnapshot } from "mobx-state-tree"
import { RootStoreModel, RootStore } from "./root-store"
import * as storage from "../../utils/storage"

/**
 * The key we'll be saving our state as within async storage.
 */
const ROOT_STATE_STORAGE_KEY = "root"
const TELEMETRY_DISABLED_STORAGE_KEY = "telemetry_disabled"

/**
 * Setup the root state.
 */
export async function setupRootStore() {
  let rootStore: RootStore
  let data: any

  // prepare the environment that will be associated with the RootStore.
  try {
    // load data from storage
    data = (await storage.load(ROOT_STATE_STORAGE_KEY)) || {}
    rootStore = RootStoreModel.create(data)
  } catch (e) {
    // if there's any problems loading, then let's at least fallback to an empty state
    // instead of crashing.
    rootStore = RootStoreModel.create({})
  }

  // Sync telemetry disabled flag with async storage for backwards compatibility
  // If user model has disableTelemetry set but async storage flag doesn't exist, create it
  if (rootStore.user.disableTelemetry === true) {
    const telemetryDisabledFlag = await storage.load(TELEMETRY_DISABLED_STORAGE_KEY)
    if (!telemetryDisabledFlag) {
      await storage.save(TELEMETRY_DISABLED_STORAGE_KEY, true)
    }
  } else if (rootStore.user.disableTelemetry === false) {
    // If telemetry is explicitly enabled, ensure the flag is removed
    await storage.remove(TELEMETRY_DISABLED_STORAGE_KEY)
  }

  // track changes & save to storage
  onSnapshot(rootStore, (snapshot) => storage.save(ROOT_STATE_STORAGE_KEY, snapshot))

  return rootStore
}
