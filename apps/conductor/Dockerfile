FROM oven/bun:1.3.6-alpine
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY src ./src
USER bun
EXPOSE 3000
CMD ["bun", "src/index.ts"]
