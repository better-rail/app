#!/bin/bash
set -e

# Which platform to publish to. Defaults to all platforms.
# Usage: eas-update.sh [ios|android|all]
PLATFORM="${1:-all}"

if [[ "$PLATFORM" != "all" && "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  echo "Usage: $0 [ios|android|all]   (default: all)"
  exit 1
fi

cd "$(dirname "$0")/../apps/mobile"

# Tag the release as v<app-version>-update.<n>, where n is one more than the
# highest existing update tag for this version (e.g. v2.8.4-update.1).
VERSION=$(bunx expo config --type public --json 2>/dev/null | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => process.stdout.write(JSON.parse(s).version));
')
git fetch --tags --quiet || true
LAST=$(git tag --list "v${VERSION}-update.*" | sed "s/^v${VERSION}-update\.//" | sort -n | tail -1)
NEXT=$(( ${LAST:-0} + 1 ))
TAG="v${VERSION}-update.${NEXT}"

# Prompt with the tag as dimmed placeholder text; Tab fills it in.
MESSAGE=$(node -e '
const readline = require("readline");
const suggestion = process.argv[1];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr,
  terminal: true,
  completer: (line) => [line ? [] : [suggestion], line],
});
const ghost = `\x1b[2m${suggestion}\x1b[0m\x1b[${suggestion.length}D`;
rl.on("SIGINT", () => {
  process.stderr.write("\n");
  process.exit(130);
});
rl.question("Update message: ", (answer) => {
  rl.close();
  process.stdout.write(answer.trim());
});
process.stderr.write(ghost);
process.stdin.on("keypress", (_, key) => {
  if (key?.name === "return" || key?.name === "enter") return;
  if (rl.line === "") process.stderr.write(ghost);
  else if (rl.cursor === rl.line.length) process.stderr.write("\x1b[K");
});
' "$TAG")

if [ -z "$MESSAGE" ]; then
  echo "Message cannot be empty."
  exit 1
fi

# Check for the Sentry token before publishing so we never ship an update without
# its source maps. Bun's env loader (cwd is apps/mobile) finds it whether exported
# or set in a .env file, same as the uploader does.
if ! bun -e "process.env.SENTRY_AUTH_TOKEN || process.exit(1)" 2>/dev/null; then
  echo "❌ SENTRY_AUTH_TOKEN is not set."
  echo "   Add it to apps/mobile/.env.local or export it before running this script."
  exit 1
fi

# A single `eas update` (one platform or all) exports its bundles + source maps
# into dist/, so one upload afterwards always covers exactly what was published.
EAS_ARGS=(--channel production --message "$MESSAGE" --environment production)
if [ "$PLATFORM" != "all" ]; then
  EAS_ARGS+=(--platform "$PLATFORM")
fi

echo "🚀 Releasing EAS update ($PLATFORM): \"$MESSAGE\""
echo ""

eas update "${EAS_ARGS[@]}"

echo ""
echo "🗺️  Uploading source maps to Sentry..."
bun run update:sourcemaps

echo ""
echo "🏷️  Tagging release..."

git tag "$TAG"
git push origin "$TAG"

echo ""
echo "✅ Update published, source maps uploaded to Sentry, and tagged $TAG!"
