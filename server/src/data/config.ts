import { config } from "dotenv"
config()

type Enviroment = "production" | "test"

export const env: Enviroment = (process.env.NODE_ENV as Enviroment) || "test"
export const port = process.env.PORT || 3000
export const redisUrl = process.env.REDIS_URL as string
export const railUrl = process.env.RAIL_URL as string
export const telegramUrl = process.env.TELEGRAM_URL as string
export const telegramKey = process.env.TELEGRAM_KEY as string
export const appleBundleId = process.env.APPLE_BUNDLE_ID as string
export const appleTeamId = process.env.APPLE_TEAM_ID as string
export const appleKeyId = process.env.APPLE_KEY_ID as string
export const appleKeyContent = (process.env.APPLE_KEY_CONTENT as string).replace(/\\n/g, "\n")
export const appleApnUrl = env === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com"
