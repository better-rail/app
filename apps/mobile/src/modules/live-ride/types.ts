export interface NotificationPermissionState {
  granted: boolean
  canPromoteOngoing?: boolean
  canScheduleExactAlarms: boolean
}

export const SemanticColor = {
  UNSPECIFIED: 0,
  INFO: 1,
  SAFE: 2,
  CAUTION: 3,
  DANGER: 4,
} as const

export type SemanticColorType = (typeof SemanticColor)[keyof typeof SemanticColor]

/** A fragment of the title or body to color, e.g. a significant delay */
export interface TextHighlight {
  text: string
  style: SemanticColorType
}

export interface LiveRideStaleContent {
  title: string
  body: string
  untilMs: number
  shortCriticalText: string
  stopActionText?: string
  progress?: number
  maxProgress?: number
  transferPoints?: number[]
  highlights?: TextHighlight[]
  delayed?: boolean
}

export interface LiveRideUpdatePayload {
  title: string
  body: string
  currentStop: number
  totalStops: number
  progress?: number
  maxProgress?: number
  /** Progress values where the rider changes trains */
  transferPoints?: number[]
  isArrived: boolean
  shortCriticalText: string
  stopActionText?: string
  stale?: LiveRideStaleContent
  staleAfterMs: number
  alertOnce?: boolean
  highlights?: TextHighlight[]
  /** Paints the rest of the track red */
  delayed?: boolean
}

export interface AndroidAlert {
  tag: string
  channelId: string
  title: string
  body: string
  timeoutMs: number
}

export interface LiveRideNativeBridge {
  updateLiveRide(payload: LiveRideUpdatePayload): Promise<boolean>
  cancelLiveRide(): Promise<boolean>
  canPostPromoted(): Promise<boolean | undefined>
  canScheduleExactAlarms(): Promise<boolean>
  postAlert(alert: AndroidAlert): Promise<boolean>
}
