import type { RouteItem } from "@/services/api/rail-api.types"

export interface NotificationPermissionState {
  granted: boolean
  canPromoteOngoing: boolean
  canScheduleExactAlarms: boolean
}

export interface LiveRideSession {
  rideId: string
  route: RouteItem
}

export const SemanticColor = {
  UNSPECIFIED: 0,
  INFO: 1,
  SAFE: 2,
  CAUTION: 3,
  DANGER: 4,
} as const

export type SemanticColorType = (typeof SemanticColor)[keyof typeof SemanticColor]

export interface LiveRideStaleContent {
  title: string
  body: string
  untilMs: number
  shortCriticalText: string
  stopActionText?: string
  progress?: number
  maxProgress?: number
  titleSemanticStyle?: SemanticColorType
}

export interface LiveRideUpdatePayload {
  title: string
  body: string
  currentStop: number
  totalStops: number
  progress?: number
  maxProgress?: number
  isArrived: boolean
  shortCriticalText: string
  stopActionText?: string
  stale?: LiveRideStaleContent
  staleAfterMs: number
  alertOnce?: boolean
  titleSemanticStyle?: SemanticColorType
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
  canPostPromoted(): Promise<boolean>
  canScheduleExactAlarms(): Promise<boolean>
  postAlert(alert: AndroidAlert): Promise<boolean>
}

export interface LiveRideNotificationModule {
  checkPermissions(): Promise<NotificationPermissionState>
  requestPermissions(): Promise<NotificationPermissionState>
  start(route: RouteItem, rideId?: string): Promise<LiveRideSession>
  processIncomingPush(rawPayload: unknown): Promise<void>
  stop(): Promise<void>
}
