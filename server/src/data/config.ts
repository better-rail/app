import { config } from "dotenv"
config()

const port = process.env.PORT || 3000
const redisUrl = process.env.REDIS_URL
const railUrl = process.env.RAIL_URL

export { port, redisUrl, railUrl }
