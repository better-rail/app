import { Host } from "apns2"
import { config } from "dotenv"
config()

type Enviroment = "production" | "test"

export const env: Enviroment = (process.env.NODE_ENV as Enviroment) || "test"
export const port = process.env.PORT || 3000
export const redisUrl = process.env.REDIS_URL as string
export const mongoUrl = process.env.MONGO_URL as string
export const railUrl = process.env.RAIL_URL as string
export const appleBundleId = process.env.APPLE_BUNDLE_ID as string
export const appleTeamId = process.env.APPLE_TEAM_ID as string
export const appleKeyId = process.env.APPLE_KEY_ID as string
export const appleKeyContent = (process.env.APPLE_KEY_CONTENT as string)?.replace(/\\n/g, "\n")
export const appleApnHost = process.env.APN_ENV === "production" ? Host.production : Host.development
export const firebaseAdminAuth = JSON.parse(process.env.FIREBASE_ADMIN_AUTH || "{}")
