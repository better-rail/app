import { create } from "zustand"

export interface UserState {
  disableTelemetry: boolean | undefined
}

export interface UserActions {
  setDisableTelemetry: (value: boolean) => void
}

export type UserStore = UserState & UserActions

const initialUserState: UserState = {
  disableTelemetry: undefined,
}

export const resetUserStore = () => useUserStore.setState(initialUserState)

export const useUserStore = create<UserStore>((set) => ({
  ...initialUserState,

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
