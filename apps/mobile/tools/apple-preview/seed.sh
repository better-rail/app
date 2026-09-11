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

# FavoritesModel encodes [FavoriteRoute]; Station encodes {id, <locale key>}.
read -r -d '' FAVORITES <<'JSON' || true
[
  {"origin":{"id":"3100","english":"Hadera - West"},"destination":{"id":"3600","english":"Tel Aviv - University"}},
  {"origin":{"id":"3600","english":"Tel Aviv - University"},"destination":{"id":"3100","english":"Hadera - West"}},
  {"origin":{"id":"2300","english":"Haifa - Hof HaKarmel"},"destination":{"id":"2800","english":"Binyamina"},"label":"Weekend"}
]
JSON

HEX=$(printf '%s' "$FAVORITES" | xxd -p | tr -d '\n')
xcrun simctl spawn "$UDID" defaults write "$GROUP" favorites -data "$HEX"
echo "Seeded 3 favourite routes into $GROUP on $UDID"
