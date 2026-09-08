import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // The sitemap's `lastmod` (the day the site was built) and the id that keys edge-cached pages to this build.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  // The Cloudflare plugin runs the SSR environment in workerd (dev and preview) and emits the Worker + static assets on build.
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), tailwindcss(), tanstackStart(), viteReact()],
})
