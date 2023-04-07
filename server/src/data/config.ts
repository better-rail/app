import { config } from "dotenv"
config()

export const port = process.env.PORT || 3000
export const redisUrl = process.env.REDIS_URL as string
export const railUrl = process.env.RAIL_URL as string
export const telegramUrl = process.env.TELEGRAM_URL as string
export const telegramKey = process.env.TELEGRAM_KEY as string
