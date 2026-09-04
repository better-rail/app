import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import netlify from "@netlify/vite-plugin-tanstack-start"

export default defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  // The Netlify adapter is only needed to emit the serverless entry; its dev-time
  // emulation (Deno edge functions) does not cope with the monorepo's other tsconfigs.
  plugins: [tailwindcss(), tanstackStart(), ...(command === "build" ? [netlify()] : []), viteReact()],
}))
