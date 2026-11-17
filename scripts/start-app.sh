#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"
PACKAGE="com.ashi"
APK="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mHiba:\033[0m %s\n' "$*" >&2; exit 1; }

[[ -x "$ADB" ]] || die "nem találom az adb-t itt: $ADB (állítsd be az ANDROID_HOME-ot)"

device_ready() {
  [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]
}

ensure_emulator() {
  if "$ADB" get-state >/dev/null 2>&1 && device_ready; then
    log "Már fut egy eszköz: $("$ADB" get-serialno)"
    return
  fi
  [[ -x "$EMULATOR" ]] || die "nem találom az emulátort itt: $EMULATOR"
  local avd="${AVD:-$("$EMULATOR" -list-avds | head -n1)}"
  [[ -n "$avd" ]] || die "nincs Android virtuális eszköz; hozz létre egyet az Android Studio Device Managerben"
  log "Emulátor indítása: $avd"
  nohup "$EMULATOR" -avd "$avd" -no-snapshot-save -no-boot-anim >"$ROOT_DIR/.emulator.log" 2>&1 &
  "$ADB" wait-for-device
  printf '    várakozás a rendszer betöltésére'
  for _ in $(seq 1 120); do
    device_ready && { echo; return; }
    printf '.'; sleep 2
  done
  echo
  die "az emulátor 4 perc alatt sem indult el (napló: .emulator.log)"
}

screenshot() {
  local name="${1:-ashi-$(date +%Y%m%d-%H%M%S)}"
  mkdir -p "$ROOT_DIR/screenshots"
  local out="$ROOT_DIR/screenshots/${name%.png}.png"
  "$ADB" exec-out screencap -p >"$out"
  log "Képernyőkép mentve: $out"
}

run_release() {
  local build=1
  [[ "${1:-}" == "--no-build" ]] && build=0
  if [[ $build == 1 || ! -f "$APK" ]]; then
    log "Release build (első alkalommal néhány perc)"
    (cd "$ROOT_DIR/android" && ./gradlew assembleRelease -q)
  fi
  log "Telepítés"
  "$ADB" install -r "$APK" >/dev/null
  "$ADB" shell pm grant "$PACKAGE" android.permission.POST_NOTIFICATIONS 2>/dev/null || true
  log "Indítás"
  "$ADB" shell am start -n "$PACKAGE/.MainActivity" >/dev/null
  log "Fut. Szimulált adatok: a főképernyőn a demó gomb, vagy Beállítások → Demó mód. Nyelv: Beállítások → Nyelv."
}

run_dev() {
  if ! curl -s "http://localhost:8081/status" | grep -q running; then
    log "Metro indítása a háttérben (napló: .metro.log)"
    (cd "$ROOT_DIR" && nohup npx react-native start >"$ROOT_DIR/.metro.log" 2>&1 &)
    for _ in $(seq 1 30); do
      curl -s "http://localhost:8081/status" | grep -q running && break
      sleep 1
    done
  fi
  log "Debug build és indítás"
  (cd "$ROOT_DIR" && npx react-native run-android --no-packager)
}

case "${1:-}" in
  --dev) ensure_emulator; run_dev ;;
  --screenshot) shift; screenshot "${1:-}" ;;
  *) ensure_emulator; run_release "${1:-}" ;;
esac
