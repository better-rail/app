export const extractFcmData = (raw: unknown): Record<string, string> | null => {
  const obj = raw as Record<string, any> | null | undefined
  const data =
    obj?.notification?.request?.content?.data ??
    obj?.notification?.request?.trigger?.remoteMessage?.data ??
    obj?.request?.content?.data ??
    obj?.notification?.data ??
    obj?.data ??
    obj
  return typeof data?.type === "string" ? (data as Record<string, string>) : null
}
