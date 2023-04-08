import dayjs from "dayjs"
import jwt from "jsonwebtoken"
import { mapKeys } from "lodash"
import http2, { constants } from "http2"

import { appleApnUrl, appleKeyId, appleKeyContent, appleTeamId } from "../data/config"

export const getApnToken = () => {
  return jwt.sign(
    {
      iss: appleTeamId,
      iat: dayjs().unix(),
    },
    appleKeyContent,
    {
      header: {
        alg: "ES256",
        kid: appleKeyId,
      },
    },
  )
}

const client = http2.connect(appleApnUrl)
export const sendApnNotification = (deviceToken: string, headers: Record<string, string>, body?: any) => {
  const config = {
    path: "/3/device/" + deviceToken,
    method: "POST",
    scheme: "https",
  }

  return new Promise((resolve, reject) => {
    const request = client.request({
      ...mapKeys(config, (_, key) => ":" + key),
      ...headers,
    })

    request.setEncoding("utf8")
    if (body) {
      request.write(JSON.stringify(body))
    }

    const response: any = []

    request.on("response", (chunk) => {
      response.push(chunk)
    })

    request.on("response", (headers) => {
      const status = Number(headers[constants.HTTP2_HEADER_STATUS]!)

      let data = ""

      request.on("data", (chunk) => {
        data += chunk
      })

      request.on("end", () => {
        if (status === 200) {
          resolve({ status, success: true })
        } else {
          reject(new Error(`status: ${status}, reason: ${JSON.parse(data).reason}`))
        }
      })
    })

    request.on("error", (error) => {
      reject(error)
    })

    request.end()
  })
}
