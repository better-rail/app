jest.mock("expo-localization", () => {
  return {
    t: (key) => `${key}.test`,
  }
})
