# Better Rail Notification Server

Better Rail's notification server provides real-time updates on ride progress, keeping passengers informed every step of the way.

### Installation

To follow these steps, ensure that your environment is configured to run Node.js applications

> Note: Requires NodeJS 16 or above, a redis server to store active rides and mongodb to store logs

- Fork the repo and clone to your machine.
- Run `yarn install`
- Rename `.env.example` to `.env`, and fill it as required on [Enviroment Variables](#enviroment-variables)
- Run the app with `yarn dev`

### File Structure

- `/data`: stations, redis and env configurations
- `/locales`: language files for notifications
- `/logs`: logger and lognames sit here
- `/requests`: requests to the rail api sit here
- `/rides`: notification scheduler
- `/routes`: express router
- `/tests`: all the tests are here
- `/types`: all the types are here
- `/utils`: utility functions used across the server

### Enviroment Variables

- `TZ`: should always be "Asia/Jerusalem"
- `NODE_ENV`: `production` or `test`, used to determine notifications scheduler logic
- `PORT`: port express listens to
- `REDIS_URL`: connection string for redis
- `MONGO_URL`: connection string for mongodb
- `RAIL_URL`: url of the rail api
- `RAIL_API_KEY`: api key for the rail api
- `PROXY_URL`: url of the proxy service
- `APPLE_BUNDLE_ID`: bundle id of the iOS app to send notifications to
- `APPLE_TEAM_ID`: team id for the developer account associated with the iOS app
- `APPLE_KEY_ID`: apple notifications key id
- `APPLE_KEY_CONTENT`: apple notifications key content, replace new lines with `\n`
- `APN_ENV`: apple notifications server enviroment, can be `production` or `test`
- `FIREBASE_ADMIN_AUTH`: service account json for firebase project
