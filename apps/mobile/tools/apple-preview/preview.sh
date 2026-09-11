#!/usr/bin/env bash
# Generate the local Xcode project for the Apple targets and open it.
# The .xcodeproj is a build artifact — gitignored, regenerate it any time.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v xcodegen >/dev/null; then
  echo "xcodegen is required: brew install xcodegen" >&2
  exit 1
fi

xcodegen generate

if [[ "${1:-}" != "--no-open" ]]; then
  open ApplePreview.xcodeproj
fi
