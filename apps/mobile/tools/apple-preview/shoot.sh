#!/usr/bin/env bash
# Build + install the watchOS preview app and screenshot every card state.
# Usage: ./shoot.sh [watch-simulator-udid]
set -euo pipefail
cd "$(dirname "$0")"

UDID="${1:-$(xcrun simctl list devices available -j | python3 -c '
import json, sys
watches = [d for rt, ds in json.load(sys.stdin)["devices"].items() if "watchOS" in rt for d in ds]
booted = [w for w in watches if w["state"] == "Booted"]
print(((booted or watches) or [{"udid": ""}])[0]["udid"], end="")
')}"
if [ -z "$UDID" ]; then
  echo "No watchOS simulator available. Create one in Xcode, or pass a UDID." >&2
  exit 1
fi
BUNDLE=il.co.better-rail.preview.lacard
SAMPLES=("Waiting" "Waiting · delayed" "Exchange" "In transit" "Get off" "Arrived" "Stale")
HE_SAMPLES=("Hebrew" "Hebrew transit")

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

xcodebuild -project ApplePreview.xcodeproj -scheme WatchCardPreview \
  -destination "id=$UDID" -derivedDataPath .build build >/dev/null

APP=$(find .build/Build/Products -name "WatchCardPreview.app" -maxdepth 3 | head -1)
xcrun simctl install "$UDID" "$APP"

mkdir -p .screens
rm -f .screens/*.png
for sample in "${SAMPLES[@]}"; do
  slug=$(echo "$sample" | tr '[:upper:] ·' '[:lower:]--' | tr -s '-')
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  SIMCTL_CHILD_SAMPLE="$sample" xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null
  sleep 1.5
  xcrun simctl io "$UDID" screenshot ".screens/$slug.png" 2>/dev/null
done

# Hebrew / RTL pass
for sample in "${HE_SAMPLES[@]}"; do
  slug=$(echo "$sample" | tr '[:upper:] ' '[:lower:]-')
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  SIMCTL_CHILD_SAMPLE="$sample" SIMCTL_CHILD_LOCALE=he xcrun simctl launch "$UDID" "$BUNDLE" >/dev/null
  sleep 1.5
  xcrun simctl io "$UDID" screenshot ".screens/he-$slug.png" 2>/dev/null
done

echo "Wrote $(ls .screens/*.png | wc -l | tr -d ' ') screenshots to .screens/"
