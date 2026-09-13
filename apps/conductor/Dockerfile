FROM oven/bun:1.3.6-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
USER bun
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "src/index.ts"]
