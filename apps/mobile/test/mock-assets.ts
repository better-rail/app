import { plugin } from "bun"

// Station data (`@/data/stations`) requires image assets at module scope, e.g.
// `require("../../assets/station-images/tlv-center.jpg")`. Bun's test runtime has no
// loader for image files and tries to parse them as JavaScript, which crashes any test
// that transitively imports the stations data (e.g. anything importing `@/i18n`).
// Register a loader that resolves image imports to a harmless stub instead.
plugin({
  name: "image-asset-stub",
  setup(build) {
    build.onLoad({ filter: /\.(png|jpe?g|gif|webp|svg)$/ }, () => ({
      exports: { default: 1 },
      loader: "object",
    }))
  },
})
