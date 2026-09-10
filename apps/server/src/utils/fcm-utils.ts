import admin from "firebase-admin"
import { Message } from "firebase-admin/lib/messaging/messaging-api"

import { firebaseAdminAuth } from "../data/config"
import { logNames, logger } from "../logs"

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
  return admin.messaging().send(message)
}
