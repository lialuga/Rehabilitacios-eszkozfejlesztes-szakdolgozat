#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TUNNEL_PORT="${TUNNEL_PORT:-8081}"

BACKEND_CMD="cd $(printf '%q' "$ROOT_DIR") && npm run backend:start"
METRO_CMD="cd $(printf '%q' "$ROOT_DIR") && npm start"
TUNNEL_CMD="cd $(printf '%q' "$ROOT_DIR") && TUNNEL_PORT=$TUNNEL_PORT npm run dev:tunnel"

if [[ -n "${DATABASE_URL:-}" || -f "$ROOT_DIR/stepalign-backend/.env" ]]; then
  BACKEND_DISPLAY="enabled"
else
  BACKEND_DISPLAY="skipped (missing DATABASE_URL)"
  BACKEND_CMD="cd $(printf '%q' "$ROOT_DIR") && echo 'Skipping backend: set DATABASE_URL or create stepalign-backend/.env to enable it.'"
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "BACKEND: $BACKEND_CMD"
  echo "METRO:   $METRO_CMD"
  echo "TUNNEL:  $TUNNEL_CMD"
  echo "STATUS:  backend $BACKEND_DISPLAY"
  exit 0
fi

if ! command -v osascript >/dev/null 2>&1; then
  echo "This script requires macOS (osascript not found)."
  exit 1
fi

osascript \
  -e 'tell application "Terminal" to activate' \
  -e "tell application \"Terminal\" to do script \"$BACKEND_CMD\"" \
  -e "tell application \"Terminal\" to do script \"$METRO_CMD\"" \
  -e "tell application \"Terminal\" to do script \"$TUNNEL_CMD\""

echo "Opened three Terminal sessions: backend ($BACKEND_DISPLAY), Metro, and tunnel (port $TUNNEL_PORT)."