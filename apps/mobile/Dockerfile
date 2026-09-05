FROM node:22

ENV ENVIRONMENT=development

WORKDIR /usr/src/app

COPY package.json bun.lock ./

COPY . .

RUN bun install --verbose

RUN bun rename-dev-configs

EXPOSE 8081

# To start the app after building it using `docker build -t better-rail-app .` with docker
# run: `docker run -it -p 8081:8081 better-rail-app bun start`

# CMD ["bun", "start"]