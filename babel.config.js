module.exports = {
  presets: ["babel-preset-expo"],
  env: {
    production: {},
  },
  plugins: [
    ["@babel/plugin-proposal-optional-catch-binding"],
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",
        safe: false,
        allowUndefined: true,
      },
    ],
    // Reanimated's babel plugin must be listed last.
    "react-native-reanimated/plugin",
  ],
}
