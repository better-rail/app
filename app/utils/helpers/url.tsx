export function extractURLParams(url: string): { [key: string]: string } {
  const searchCharIndex = url.indexOf("?")
  
  if (searchCharIndex === -1) {
    return {}
  }
  
  const paramsString = url.substring(searchCharIndex + 1)
  const paramsArr = paramsString.split("&")

  const params = {}

  paramsArr.forEach((param) => {
    if (param.includes("=")) {
      const keyValueArr = param.split("=")
      const [key, value] = keyValueArr
      if (key && value) {
        params[key] = decodeURIComponent(value)
      }
    }
  })

  return params
}
