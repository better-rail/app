process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

import http from "http"
import axiosRetry from "axios-retry"
import axios, { AxiosInstance } from "axios"
import { HttpsProxyAgent } from "https-proxy-agent"

import { railUrl, proxyUrl, railApiKey } from "../data/config"

http.globalAgent.maxSockets = 100

export class RailApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: railUrl,
      timeout: 30000,
      httpsAgent: proxyUrl && new HttpsProxyAgent(proxyUrl),
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": railApiKey,
      },
    })

    axiosRetry(this.axiosInstance, {
      retries: 2,
      retryCondition: () => true,
      retryDelay: axiosRetry.exponentialDelay,
    })
  }
}

export const railApi = new RailApi()
