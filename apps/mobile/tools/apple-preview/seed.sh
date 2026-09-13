#!/usr/bin/env bash
# Seed sample favourite routes into a watch simulator's App Group, so the watch app and
# its widget render real content instead of the empty state.
#
# On device the watch gets these over WatchConnectivity from the phone; a standalone
# preview build has no companion, so we write the same UserDefaults key directly.
#
# Usage: ./seed.sh <watch-simulator-udid>
set -euo pipefail
cd "$(dirname "$0")"

UDID="${1:?usage: ./seed.sh <watch-simulator-udid>}"
GROUP=group.il.co.better-rail

# Station decodes the name key matching the device locale, so every route has to carry all
# four — a missing one fails the whole [FavoriteRoute] decode and the list comes up empty.
FAVORITES=$(python3 - <<'PY'
import json, pathlib

stations = {s["id"]: s for s in json.loads(pathlib.Path("../../targets/widget/stationsData.json").read_text())}
keys = ("english", "hebrew", "arabic", "russian")

def station(sid):
    s = stations[str(sid)]
    return {"id": s["id"], **{k: s[k] for k in keys}}

routes = [
    {"origin": station(3100), "destination": station(3600)},
    {"origin": station(3600), "destination": station(3100)},
    {"origin": station(2300), "destination": station(2800), "label": "Weekend"},
]
print(json.dumps(routes, ensure_ascii=False))
PY
)

HEX=$(printf '%s' "$FAVORITES" | xxd -p | tr -d '\n')
xcrun simctl spawn "$UDID" defaults write "$GROUP" favorites -data "$HEX"
echo "Seeded 3 favourite routes into $GROUP on $UDID"
