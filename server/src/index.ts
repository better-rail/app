import express from "express"

import { port } from "./data/config"
import { router } from "./routes/api"
import { connectToRedis } from "./data/redis"
import { scheduleExistingRides } from "./utils/ride-utils"

const app = express()
app.use(express.json())

app.use("/api/v1", router)

app.listen(port, async () => {
  await connectToRedis()
  scheduleExistingRides()
  console.log(`App listening at http://localhost:${port}`)
})
