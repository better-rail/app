export function extractURLParams(url: string): { [key: string]: string } {
  const searchCharIndex = url.indexOf("?")
  const paramsString = url.substr(searchCharIndex + 1, url.length)
  const paramsArr = paramsString.split("&")

  const params = {}

  paramsArr.forEach((param) => {
    const keyValueArr = param.split("=")
    const [key, value] = keyValueArr
    params[key] = value
  })

  return params
}
