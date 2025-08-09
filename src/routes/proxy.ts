import { createProxyMiddleware, Options } from "http-proxy-middleware"
import { railUrl, railApiKey } from "../data/config"

// Create proxy middleware for rail API
const railProxy = createProxyMiddleware({
  target: railUrl,
  changeOrigin: true,
  onProxyReq: (proxyReq: any) => {
    proxyReq.setHeader("Accept", "application/json")
    proxyReq.setHeader("Ocp-Apim-Subscription-Key", railApiKey)
  },
  onError: (err: any, req: any, res: any) => {
    res.status(500).json({
      error: "Failed to fetch rail data",
      message: err.message,
    })
  },
} as Options)

export { railProxy }
