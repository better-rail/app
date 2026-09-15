/** Bindings of the Worker this code runs in (`wrangler.jsonc`). Only the assets binding is used, to read static files. */
declare module "cloudflare:workers" {
  export const env: {
    ASSETS?: { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> }
  }
}

/** `@cloudflare/vite-plugin` turns a `.wasm` import into a compiled module, which is the only form Workers can instantiate. */
declare module "*.wasm" {
  const module: WebAssembly.Module
  export default module
}
