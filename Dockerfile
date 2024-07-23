FROM node:22

ENV ENVIRONMENT=development

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY bin /usr/src/app/bin

RUN yarn install

COPY . .

# Rename Firebase development configs based on OS
RUN if [ "$(uname)" == "Darwin" ] || [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then \
      yarn rename-dev-configs; \
    else \
      cp /ios/GoogleService-Info.development.plist /ios/GoogleService-Info.plist && \
      cp /android/app/firebase-config.development.js /android/app/firebase-config.js; \
    fi

EXPOSE 8081

CMD ["yarn", "start"]
