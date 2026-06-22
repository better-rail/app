module.exports = {
  presets: ["babel-preset-expo"],
  env: {
    production: {},
  },
  plugins: [
    ["@babel/plugin-proposal-optional-catch-binding"],
    // Reanimated's babel plugin must be listed last.
    "react-native-reanimated/plugin",
  ],
}
