#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APK_PATH="${APK_PATH:-$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk}"
SHARE_PORT="${SHARE_PORT:-8090}"
SHARE_MODE="${SHARE_MODE:-local}"
LINK_FILE="${LINK_FILE:-/tmp/ashi_apk_share.current}"

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found: $APK_PATH"
  echo "Build it first with: npm run android:demo:build"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve the APK file."
  exit 1
fi

APK_DIR="$(dirname "$APK_PATH")"
APK_FILE="$(basename "$APK_PATH")"

get_local_ip() {
  local ip

  for iface in en0 en1; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "$ip" ]]; then
      echo "$ip"
      return 0
    fi
  done

  ip="$(ifconfig | awk '/inet / && $2 !~ /^127\./ {print $2; exit}' || true)"
  if [[ -n "$ip" ]]; then
    echo "$ip"
    return 0
  fi

  return 1
}

find_free_port() {
  local start_port="$1"
  local max_port=$((start_port + 20))
  local port

  for ((port = start_port; port <= max_port; port++)); do
    if ! lsof -ti tcp:"$port" >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
  done

  return 1
}

cleanup() {
  if [[ -n "${HTTP_PID:-}" ]] && kill -0 "$HTTP_PID" 2>/dev/null; then
    kill "$HTTP_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$APK_DIR"
if ! FREE_PORT="$(find_free_port "$SHARE_PORT")"; then
  echo "No free port found in range ${SHARE_PORT}-$((SHARE_PORT + 20))."
  exit 1
fi

SHARE_PORT="$FREE_PORT"
python3 -m http.server "$SHARE_PORT" >/tmp/ashi_apk_http.log 2>&1 &
HTTP_PID=$!

sleep 1
if ! kill -0 "$HTTP_PID" 2>/dev/null; then
  echo "Failed to start local file server on port $SHARE_PORT"
  exit 1
fi

LOCAL_IP="$(get_local_ip || true)"
if [[ -z "$LOCAL_IP" ]]; then
  echo "Could not detect local IP. Connect to Wi-Fi or set LOCAL_IP manually."
  echo "Fallback local URL (same machine only): http://127.0.0.1:$SHARE_PORT/$APK_FILE"
  echo "http://127.0.0.1:$SHARE_PORT/$APK_FILE" > "$LINK_FILE"
else
  LOCAL_URL="http://$LOCAL_IP:$SHARE_PORT/$APK_FILE"
  echo "APK local install link: $LOCAL_URL"
  echo "$LOCAL_URL" > "$LINK_FILE"
fi

echo "Share mode: $SHARE_MODE"
echo "Press Ctrl+C to stop sharing."

if [[ "$SHARE_MODE" == "local" ]]; then
  wait "$HTTP_PID"
  exit $?
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "ssh is required for tunnel mode (localhost.run)."
  exit 1
fi

echo "Starting public share tunnel..."

ssh \
  -T \
  -o StrictHostKeyChecking=no \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -R "80:localhost:${SHARE_PORT}" \
  nokey@localhost.run | while IFS= read -r line; do
    echo "$line"
    if [[ "$line" == *"tunneled with tls termination, https://"* ]]; then
      domain="$(printf '%s' "$line" | grep -Eo '[a-z0-9.-]+\.(lhr\.life|localhost\.run)' | tail -n 1 || true)"
      if [[ -n "$domain" ]]; then
        public_url="https://$domain/$APK_FILE"
        echo "APK public install link: $public_url"
        echo "$public_url" > "$LINK_FILE"
      fi
    fi
  done