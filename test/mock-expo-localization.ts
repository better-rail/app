import { mock } from "bun:test"

mock.module("expo-localization", () => {
  return {
    getLocales: () => [
      {
        languageCode: "en",
        languageTag: "en-US",
        regionCode: "US",
        currencyCode: "USD",
        currencySymbol: "$",
        decimalSeparator: ".",
        digitGroupingSeparator: ",",
        textDirection: "ltr",
        measurementSystem: "metric",
        temperatureUnit: "celsius"
      }
    ]
  }
})
