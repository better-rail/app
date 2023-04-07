import express from "express"

import { router } from "./routes/api"
import { port } from "./data/config"
import { connectToRedis } from "./data/redis"

const app = express()
app.use(express.json())

app.use("/api/v1", router)

app.listen(port, async () => {
  await connectToRedis()
  console.log(`App listening at http://localhost:${port}`)
})
