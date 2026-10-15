import { create } from "zustand"
import { israelNow } from "@/utils/helpers/date-helpers"

export type Voucher = {
  confirmationCode: string
  trainNumber: number
  /** yyyy-MM-dd, as Israel Rail keys the train */
  departureDate: string
  departureTime: number
  arrivalTime: number
  fromStationId: number
  toStationId: number
  passengers: number
  phone: string
  createdAt: number
}

export interface VouchersState {
  vouchers: Voucher[]
  /** Last phone number used to book, prefilled next time */
  phone: string
}

export interface VouchersActions {
  add: (voucher: Voucher) => void
  setPhone: (phone: string) => void
}

export type VouchersStore = VouchersState & VouchersActions

// Kept a day past arrival, in case the rider is asked for it after the trip
const KEEP_AFTER_ARRIVAL_MS = 24 * 60 * 60 * 1000

const initialVouchersState: VouchersState = {
  vouchers: [],
  phone: "",
}

export const resetVouchersStore = () => useVouchersStore.setState(initialVouchersState)

export const useVouchersStore = create<VouchersStore>((set) => ({
  ...initialVouchersState,

  add(voucher) {
    set((state) => ({ vouchers: [...state.vouchers, voucher] }))
  },

  setPhone(phone) {
    set({ phone })
  },
}))

/** Vouchers the rider holds for a train on a given day, newest first. */
export function findVouchers(vouchers: Voucher[], trainNumber: number, departureDate: string) {
  return vouchers
    .filter((voucher) => voucher.trainNumber === trainNumber && voucher.departureDate === departureDate)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** The next voucher the rider still needs: the earliest one whose train hasn't arrived yet. */
export function findUpcomingVoucher(vouchers: Voucher[], now = israelNow()) {
  return vouchers.filter((voucher) => voucher.arrivalTime > now).sort((a, b) => a.departureTime - b.departureTime)[0]
}

export function getVouchersSnapshot(state: VouchersState) {
  return { vouchers: state.vouchers, phone: state.phone }
}

export function hydrateVouchersStore(data: any) {
  if (!data) return
  const cutoff = israelNow() - KEEP_AFTER_ARRIVAL_MS
  useVouchersStore.setState({
    vouchers: (data.vouchers ?? []).filter((voucher: Voucher) => voucher.arrivalTime > cutoff),
    phone: data.phone ?? "",
  })
}
