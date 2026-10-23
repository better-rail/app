# One-shot GTFS ingest job (ingest/main.ts) for Cloudflare Containers.
# Build context is apps/api: `docker build -f ingest/Dockerfile .`
# No port: the container downloads, parses and POSTs the feed to the Worker, then exits.
FROM oven/bun:1.3.6-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY src ./src
COPY ingest ./ingest

USER bun
CMD ["bun", "ingest/main.ts"]
