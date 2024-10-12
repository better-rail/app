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
    "react-native-reanimated/plugin",
  ],
}
