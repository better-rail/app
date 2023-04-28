import admin from "firebase-admin"
import { Message } from "firebase-admin/lib/messaging/messaging-api"

import { firebaseAdminAuth } from "../data/config"

export const connectToFcm = () => {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminAuth),
  })
}

export const sendFcmNotification = async (message: Message) => {
  return admin.messaging().send(message)
}
