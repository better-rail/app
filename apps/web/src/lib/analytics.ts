/** PostHog is loaded by the snippet in the document head; these helpers are safe no-ops when it is absent. */
type PostHog = { capture: (event: string, properties?: Record<string, unknown>) => void }

declare global {
  interface Window {
    posthog?: PostHog
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  try {
    window.posthog?.capture(event, properties)
  } catch {
    // analytics must never break the page
  }
}

export const POSTHOG_SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src="https://eu-assets.i.posthog.com/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1.2)}(document,window.posthog||[]);posthog.init("phc_86hcnoNOI0EchduJZT2EWStBYa7bNEJKE1f5013nHyH",{api_host:"https://eu.i.posthog.com",disable_session_recording:true,disable_surveys:true,capture_performance:false});`
