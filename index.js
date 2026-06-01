// Expo entry point. `registerRootComponent` registers the root component as "main",
// which matches the module/component name in the CNG-generated native projects.
import { registerRootComponent } from "expo"

import App from "./app/app"
import { configureNotifications } from "./app/utils/notification-helpers"

configureNotifications()

registerRootComponent(App)

export default App
