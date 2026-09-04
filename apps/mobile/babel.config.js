module.exports = {
  presets: ["babel-preset-expo"],
  env: {
    production: {},
  },
  plugins: [
    // Unistyles transforms `StyleSheet.create` (from react-native-unistyles) and the components
    // that consume those styles. `root` scopes processing to our app source (the `app/` route
    // files only use theme tokens imperatively, so they don't need processing).
    ["react-native-unistyles/plugin", { root: "src" }],
    ["@babel/plugin-proposal-optional-catch-binding"],
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./src",
        },
      },
    ],
    // Reanimated's babel plugin must be listed last.
    "react-native-reanimated/plugin",
  ],
}
