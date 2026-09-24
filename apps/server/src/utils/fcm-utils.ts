import admin from "firebase-admin"
import { Message } from "firebase-admin/lib/messaging/messaging-api"

import { firebaseAdminAuth } from "../data/config"
import { logNames, logger } from "../logs"

// FCM answers with these when Google's side hiccups; its docs say to retry.
const TRANSIENT_CODES = new Set(["messaging/internal-error", "messaging/server-unavailable"])
const RETRY_DELAY_MS = 1_000

export const isFcmConfigured = () => Boolean(firebaseAdminAuth?.project_id)

export const connectToFcm = () => {
  // FIREBASE_ADMIN_AUTH is unset on a local run; initializing without it throws.
  if (!isFcmConfigured()) {
    logger.warn(logNames.notifications.notConfigured, { service: "fcm" })
    return
  }

  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminAuth),
  })
}

export const sendFcmNotification = async (message: Message) => {
  try {
    return await admin.messaging().send(message)
  } catch (error) {
    if (!TRANSIENT_CODES.has((error as { code?: string })?.code ?? "")) throw error
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    return admin.messaging().send(message)
  }
}
