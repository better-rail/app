/** Envelope every rail-api.rail.co.il response is wrapped in. */
export type RailEnvelope<T> = {
  successStatus: number
  statusCode: number
  errorMessages: string[] | null
  result: {
    success: boolean
    /** A status code ("OTP_SENT_SUCCESS") on success, or a localized message on failure */
    errorMessage: string | null
    data: T
  } | null
}

export type TrainRemainingCapacity = {
  trainNumber: number
  departureDate: string
  remaining: number
}

export type CapacityLimit = {
  trainNumber: number
  departureDate: string
  currentPassengers: number
  maxPassengersPerCustomerPerTrip: number
}

export type VoucherConfig = {
  isActive: boolean
  /** How far ahead a voucher can be booked */
  bookingWindowHours: number
  /** How long after arrival a voucher can still be booked */
  lateBookingMinutes: number
  /** Below this share of seats left, availability is highlighted */
  lowCapacityPercent: number
  defaultTrainCapacity: number
}

export type OrderVoucherParams = {
  trainNumber: number
  departureDate: string
  fromStationId: number
  toStationId: number
  passengers: number
}
