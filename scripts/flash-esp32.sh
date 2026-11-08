#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKETCH="$ROOT_DIR/firmware/ashi_esp32"
FQBN="esp32:esp32:esp32s3:USBMode=hwcdc,CDCOnBoot=cdc,FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi"
BUILD_DIR="${BUILD_DIR:-${TMPDIR:-/tmp}/ashi-esp32-build}"

CLI="${ARDUINO_CLI:-}"
if [[ -z "$CLI" ]]; then
  if command -v arduino-cli >/dev/null 2>&1; then
    CLI="$(command -v arduino-cli)"
  else
    CLI="/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli"
  fi
fi
[[ -x "$CLI" ]] || { echo "arduino-cli not found (install Arduino IDE 2 or set ARDUINO_CLI)"; exit 1; }

detect_port() {
  local p
  for p in /dev/cu.usbmodem* /dev/cu.usbserial* /dev/cu.wchusbserial* /dev/cu.SLAB_USBtoUART*; do
    if [[ -e "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  return 0
}

PORT="${PORT:-$(detect_port)}"
MODE="${1:-flash}"

if [[ "$MODE" == "monitor" ]]; then
  [[ -n "$PORT" ]] || { echo "No ESP32 serial port found. Plug the board in via USB."; exit 1; }
  exec "$CLI" monitor -p "$PORT" --config baudrate=115200
fi

echo "▶ Compiling $SKETCH"
"$CLI" compile --fqbn "$FQBN" --build-path "$BUILD_DIR" "$SKETCH"

if [[ "$MODE" == "compile" ]]; then
  exit 0
fi

[[ -n "$PORT" ]] || {
  echo "No ESP32 serial port found. Plug the board in (use the USB port labelled 'USB' or 'COM')."
  echo "If it still doesn't show up: hold BOOT, tap RST, release BOOT, then run again."
  exit 1
}

echo "▶ Uploading to $PORT"
"$CLI" upload --fqbn "$FQBN" --input-dir "$BUILD_DIR" -p "$PORT"
echo "✅ Done. Open the monitor with: npm run esp32:monitor"
