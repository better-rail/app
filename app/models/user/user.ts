import { create } from "zustand"

export interface UserState {
  disableTelemetry: boolean | undefined
}

export interface UserActions {
  setDisableTelemetry: (value: boolean) => void
}

export type UserStore = UserState & UserActions

export const useUserStore = create<UserStore>((set) => ({
  disableTelemetry: undefined,

  setDisableTelemetry(value) {
    set({ disableTelemetry: value })
  },
}))

export function getUserSnapshot(state: UserState) {
  return { disableTelemetry: state.disableTelemetry }
}

export function hydrateUserStore(data: any) {
  if (!data) return
  useUserStore.setState({
    disableTelemetry: data.disableTelemetry ?? undefined,
  })
}
