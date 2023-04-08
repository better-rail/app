import { ClientHttp2Session } from "http2"
import { mapKeys } from "lodash"

export const http2Request = (
  client: ClientHttp2Session,
  config: Record<string, string>,
  headers: Record<string, string>,
  body?: any,
) => {
  return new Promise((resolve, reject) => {
    mapKeys(config, (key) => ":" + key)
    const request = client.request({
      ...mapKeys(config, (key) => ":" + key),
      ...headers,
    })

    request.setEncoding("utf8")
    if (body) {
      request.write(JSON.stringify(body))
    }

    const response: any = []

    request.on("data", (chunk) => {
      response.push(chunk)
    })

    request.on("end", () => {
      try {
        const formatted = JSON.parse(Buffer.concat(response).toString())
        resolve(formatted)
      } catch (e) {
        reject(e)
      }
    })

    request.on("error", (error) => {
      reject(error)
    })

    request.end()
  })
}
