#!/usr/bin/env bash

set -euo pipefail

PORT="${1:-${TUNNEL_PORT:-8081}}"
MAX_RETRIES="${TUNNEL_MAX_RETRIES:-8}"
WAIT_SECONDS="${TUNNEL_WAIT_SECONDS:-25}"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-auto}"
TUNNEL_URL_FILE="${TUNNEL_URL_FILE:-/tmp/ashi_tunnel_url.current}"
BUNDLE_PATH="/index.bundle?platform=android&dev=true&minify=false"

has_ngrok_auth() {
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
    return 0
  fi

  local config_path="${HOME}/.config/ngrok/ngrok.yml"
  if [[ -f "$config_path" ]] && grep -Eq '^authtoken:\s*.+$' "$config_path"; then
    return 0
  fi

  return 1
}

validate_bundle_url() {
  local url="$1"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "${url}${BUNDLE_PATH}" || true)"
  [[ "$status" == "200" ]]
}

run_localhostrun() {
  local attempt=1
  while (( attempt <= MAX_RETRIES )); do
    local log_file
    log_file="$(mktemp -t ashi-localhostrun.XXXXXX.log)"

    ssh \
      -o StrictHostKeyChecking=no \
      -o ExitOnForwardFailure=yes \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -R "80:localhost:${PORT}" \
      nokey@localhost.run >"$log_file" 2>&1 &
    local tunnel_pid=$!

    local elapsed=0
    local url=""
    while (( elapsed < WAIT_SECONDS )); do
      if ! kill -0 "$tunnel_pid" 2>/dev/null; then
        break
      fi

      url="$(grep -E 'tunneled with tls termination, https://' "$log_file" | grep -Eo 'https://[^ ]+' | tail -n 1 || true)"
      if [[ -n "$url" ]] && validate_bundle_url "$url"; then
        echo "Using localhost.run on port $PORT"
        echo "your url is: $url"
        echo "$url" > "$TUNNEL_URL_FILE"
        wait "$tunnel_pid"
        return $?
      fi

      sleep 1
      elapsed=$((elapsed + 1))
    done

    if kill -0 "$tunnel_pid" 2>/dev/null; then
      kill "$tunnel_pid" 2>/dev/null || true
    fi
    wait "$tunnel_pid" 2>/dev/null || true

    echo "localhost.run attempt $attempt/$MAX_RETRIES failed. Retrying..."
    attempt=$((attempt + 1))
  done

  return 1
}

run_localtunnel() {
  echo "Ngrok auth token not found, using localtunnel on port $PORT"
  if command -v curl >/dev/null 2>&1; then
    local tunnel_password
    tunnel_password="$(curl -s https://loca.lt/mytunnelpassword || true)"
    if [[ -n "$tunnel_password" ]]; then
      echo "Localtunnel password: $tunnel_password"
    fi
  fi

  local attempt=1
  while (( attempt <= MAX_RETRIES )); do
    local log_file
    log_file="$(mktemp -t ashi-localtunnel.XXXXXX.log)"
    npx localtunnel --port "$PORT" >"$log_file" 2>&1 &
    local tunnel_pid=$!

    local url=""
    local elapsed=0
    while (( elapsed < WAIT_SECONDS )); do
      if ! kill -0 "$tunnel_pid" 2>/dev/null; then
        break
      fi

      url="$(grep -Eo 'https://[^ ]+\.loca\.lt' "$log_file" | tail -n 1 || true)"
      if [[ -n "$url" ]] && validate_bundle_url "$url"; then
        echo "your url is: $url"
        echo "$url" > "$TUNNEL_URL_FILE"
        wait "$tunnel_pid"
        return $?
      fi

      sleep 1
      elapsed=$((elapsed + 1))
    done

    if kill -0 "$tunnel_pid" 2>/dev/null; then
      kill "$tunnel_pid" 2>/dev/null || true
    fi
    wait "$tunnel_pid" 2>/dev/null || true

    echo "localtunnel attempt $attempt/$MAX_RETRIES failed. Retrying..."
    attempt=$((attempt + 1))
  done

  return 1
}

run_ngrok() {
  echo "Using ngrok on port $PORT"
  exec ngrok http "$PORT"
}

case "$TUNNEL_PROVIDER" in
  ngrok)
    if command -v ngrok >/dev/null 2>&1 && has_ngrok_auth; then
      run_ngrok
    fi
    echo "TUNNEL_PROVIDER=ngrok requested but ngrok auth is not configured."
    exit 1
    ;;
  localhostrun)
    run_localhostrun || {
      echo "Failed to create a healthy localhost.run tunnel."
      exit 1
    }
    exit 0
    ;;
  localtunnel)
    run_localtunnel || {
      echo "Failed to create a healthy localtunnel URL."
      exit 1
    }
    exit 0
    ;;
  auto)
    if command -v ngrok >/dev/null 2>&1 && has_ngrok_auth; then
      run_ngrok
    fi

    if command -v ssh >/dev/null 2>&1; then
      if run_localhostrun; then
        exit 0
      fi
      echo "Falling back from localhost.run to localtunnel..."
    fi

    if run_localtunnel; then
      exit 0
    fi

    echo "Failed to create a healthy public tunnel in auto mode."
    exit 1
    ;;
  *)
    echo "Unknown TUNNEL_PROVIDER: $TUNNEL_PROVIDER"
    echo "Supported values: auto | ngrok | localhostrun | localtunnel"
    exit 1
    ;;
esac