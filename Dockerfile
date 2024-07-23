FROM node:22

ENV ENVIRONMENT=development

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

COPY . .

RUN yarn install --verbose

RUN yarn rename-dev-configs

EXPOSE 8081

CMD ["yarn", "start"]
