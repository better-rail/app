// Wrangler bundles .html imports as text (its default Text rule); Bun's test runner does the same via `with { type: "text" }`.
declare module "*.html" {
  const content: string
  export default content
}
