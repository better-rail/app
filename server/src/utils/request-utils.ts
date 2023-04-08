import { mapKeys } from "lodash"
import { ClientHttp2Session, constants } from "http2"

export const http2Request = (
  client: ClientHttp2Session,
  config: Record<string, string>,
  headers: Record<string, string>,
  body?: any,
) => {
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
      let status = headers[constants.HTTP2_HEADER_STATUS]!.toString()

      let data = ""

      request.on("data", (chunk) => {
        data += chunk
      })

      request.on("end", () => {
        resolve({ status: Number(status), error: status !== "200" && JSON.parse(data) })
      })
    })

    request.on("error", (error) => {
      reject({ error })
    })

    request.end()
  })
}
