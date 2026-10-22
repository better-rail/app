# Egress proxy

A tiny Bun service that relays requests from the API Worker to at most two upstreams: the MOT SIRI realtime API (the one
that needs it) and, optionally, the Israel Railways API. It runs on a host with a fixed public IP and nothing else.

## Why it exists

Cloudflare Workers egress from shared Cloudflare addresses, and two of the API's upstreams cannot be called from there:
the MOT SIRI API only answers the one egress IP registered with MOT (and `moran.mot.gov.il` serves an incomplete TLS
chain that needs a per-request CA override). The Israel Railways API turned out to be reachable from a Worker directly
(its WAF only wants a User-Agent), so relaying it is optional (`EGRESS_PROXY_RELAY_RAIL=true` on the Worker), kept for
the day it is geo-fenced and needs an Israeli HTTP proxy (`PROXY_URL`). A Worker's `fetch` can express none of that, so the Worker sends those
requests here as `METHOD /fetch?url=<encoded absolute target url>` with the original headers and body, and this process
makes the real call with Bun's per-request `tls` and `proxy` options.

It is deliberately not a general proxy: every call needs the shared bearer token, the target host must be one of the
configured upstreams (anything else is a 403), and upstream redirects are returned to the caller rather than followed.

## Endpoints

| Route                     | Auth                                         | Behaviour                                                                                                                   |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`             | none                                         | `200 ok`                                                                                                                    |
| `ANY /fetch?url=<target>` | `Authorization: Bearer <EGRESS_PROXY_TOKEN>` | Forwards the request to `target` and returns the upstream status, body and `content-type`, plus `x-egress-upstream-status`. |

Headers are copied through except hop-by-hop ones and our own `Authorization`, so `Ocp-Apim-Subscription-Key`,
`content-type`, `accept` and friends reach the upstream untouched. Errors are JSON: `401` bad token, `403` host not
allow-listed, `504 {"error":"upstream timeout"}` after `EGRESS_TIMEOUT_MS`, `502 {"error":"upstream unreachable"}` on
a network failure. The SIRI key travels in the target's query string, so neither logs nor error bodies ever include it.

## Environment

| Variable             | Required       | Meaning                                                                                                                   |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `EGRESS_PROXY_TOKEN` | yes            | Shared secret; the process refuses to start without it. Same value as the Worker's `EGRESS_PROXY_TOKEN`.                  |
| `SIRI_URL`           | one of the two | MOT SIRI base URL. Only its host matters for the allow list.                                                              |
| `RAIL_URL`           | one of the two | Israel Railways API base URL. Only its host matters for the allow list.                                                   |
| `SIRI_CA_PEM`        | no             | The missing intermediate(+root) PEM for `moran.mot.gov.il`, `\n`-escaped on one line. Used as `tls.ca` for the SIRI host. |
| `SIRI_TLS_INSECURE`  | no             | `true` skips TLS verification for the SIRI host only. Fallback when `SIRI_CA_PEM` is unset.                               |
| `PROXY_URL`          | no             | HTTP proxy with an Israeli egress for the rail host, e.g. `http://user:pass@host:port`.                                   |
| `RAIL_TLS_INSECURE`  | no             | `true` skips TLS verification for the rail host only.                                                                     |
| `PORT`               | no             | Listening port, default `3000`.                                                                                           |
| `EGRESS_TIMEOUT_MS`  | no             | Per-request upstream deadline, default `60000`.                                                                           |

Targets must be `https`; plain `http` is accepted only when the configured upstream URL itself is `http` (the tests use
a local http upstream). Request bodies are capped at 1 MB.

## Deploying

Run it anywhere whose public IP MOT has allow-listed, and which can reach the rail API (directly from Israel or through
`PROXY_URL`). The old Railway service already had that IP, so the simplest option is a Railway service built from
`apps/egress-proxy` with the Dockerfile:

1. New service from this repo, root directory `apps/egress-proxy`, builder "Dockerfile".
2. Set the variables above (`EGRESS_PROXY_TOKEN` from `openssl rand -hex 32`).
3. Expose it with a public domain; `GET /health` should answer `ok`.

A VPS works the same way: `docker build -t egress-proxy apps/egress-proxy && docker run --env-file .env -p 3000:3000
egress-proxy`, or just `bun install && bun start` with the variables in the environment. Put it behind TLS; the bearer
token is the only thing between the internet and your upstream credentials.

## Pointing the Worker at it

Set two secrets on the API Worker (`apps/api`):

- `EGRESS_PROXY_URL` — the proxy's public base URL, e.g. `https://egress.better-rail.example`.
- `EGRESS_PROXY_TOKEN` — the same token the proxy was started with.

`apps/api/src/utils/egress.ts` then routes every request whose host matches `SIRI_URL` or `RAIL_URL` through
`<EGRESS_PROXY_URL>/fetch?url=...`; all other requests are unaffected. Leave `EGRESS_PROXY_URL` unset and the Worker
calls the upstreams directly, which is what you want the day MOT allow-lists the Worker's egress or for local work
against a reachable upstream.

## Development

```sh
cd apps/egress-proxy
cp .env.example .env   # fill in EGRESS_PROXY_TOKEN and the upstream URLs
bun run dev            # reloads on change
bun test               # local upstream, no network needed
bun run check          # tsc --noEmit
```

Try it: `curl -H "Authorization: Bearer $EGRESS_PROXY_TOKEN" "http://localhost:3000/fetch?url=$(python3 -c
'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' "$RAIL_URL/rjpa/api/v1/timetable/...")"`.
