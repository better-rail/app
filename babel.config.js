const path = require("path")

const envPath = path.resolve(__dirname, ".env")

module.exports = {
  presets: ["module:@react-native/babel-preset"],
  env: {
    production: {},
  },
  plugins: [
    [
      "@babel/plugin-proposal-decorators",
      {
        legacy: true,
      },
    ],
    ["@babel/plugin-proposal-optional-catch-binding"],
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: envPath,
      },
    ],
    "react-native-reanimated/plugin",
  ],
}
