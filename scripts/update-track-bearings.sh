#!/bin/bash
#
# Updates track bearings from fresh OSM data.
# Run this when new stations or routes are added to Israel Railways.
#
# Usage: ./scripts/update.sh
# Requires: bun, curl

set -euo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="app/data/directions"

echo "=== 1/2 Downloading OSM railway data ==="
curl -s -o "$DATA_DIR/osm_rails.json" "https://overpass-api.de/api/interpreter?data=[out:json];way[\"railway\"=\"rail\"](29.5,34.2,33.5,35.9);out geom;"
echo "  Downloaded $DATA_DIR/osm_rails.json"

echo ""
echo "=== 2/2 Building track bearings from OSM ==="
bun scripts/build_track_bearings.ts

echo ""
echo "=== Done! ==="
echo "Updated: $DATA_DIR/track_bearings.json"
echo ""
echo "If a new station was added, first add it to app/data/stations.ts"
echo "with its lat/lon coordinates, then re-run this script."
