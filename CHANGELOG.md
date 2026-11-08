# Changelog

All notable changes to this project are documented here.

## 2026-11-05 — 1.0.0: background recording, cloud sync, BLE pairing

### App
- Background recording: iOS `UIBackgroundModes = bluetooth-central`; Android foreground service (`connectedDevice`, silent ongoing notification) while a session is active. Verified on the Android emulator with the screen off for 45 s.
- Optional "Keep screen on" while recording; UI refresh + sync when returning to the foreground.
- Cloud sync (Settings → Cloud sync): offline-first upload of saved sessions to the backend, idempotent re-uploads, queued remote deletes, automatic retry, status + device id in Settings.
- Settings sync to the sensor is sequential and retries while the user enters the BLE PIN; a "pairing needed" notice with Retry is shown if it fails.
- Version 1.0.0 (package.json, iOS MARKETING_VERSION, Android versionName).

### Firmware
- Control characteristic requires a PIN bond (`BLE_REQUIRE_PIN`, `BLE_PIN`); sensor data stays readable without pairing.
- Battery reading averaged and smoothed; board profiles (`BOARD_BREADBOARD_S3`, `BOARD_PCB` placeholder).

### Backend (`stepalign-backend`, 1.0.0)
- Schema v2 (all app metrics, `clientId` unique per user, cascade deletes, optional email); migration `20261105090000_session_v2`.
- Validated DTO (400 on bad input), `POST /session` upsert, `GET /session/:userId` newest first, `DELETE /session/:userId/:clientId`, `GET /health`.
- Listens on 0.0.0.0 (reachable from phones on the LAN); fixed build output path so `npm run start:prod` works.
- Unit + e2e tests (e2e against the local database, self-cleaning).

### Fixes
- Android: the session summary chart stayed empty when the sheet opened right after finishing a session (missed `onLayout` inside the Modal); `LineChart` now falls back to native `measure()`.

### Licensing
- LiquidGlassKit has no upstream licence; the earlier "MIT" label was wrong and is corrected. Needs a decision before release (see `THIRD_PARTY_NOTICES.md`).

## 2026-11-04 (3) — Firmware v2: filtering, two-sided cues, steps

### Firmware (`firmware/ashi_esp32`, v2.0)
- MPU6050 range ±8 g / ±1000 °/s (gait saturated ±2 g / ±250 °/s).
- Gyro is no longer low-passed before Madgwick; accelerometer ignored outside 0.85–1.15 g (impacts); filter integrates the measured dt; warm-up from the resting gravity vector so the angle is right immediately.
- Vibration on inward AND outward tilt: separate thresholds, outward (fall risk) uses a distinct double pulse; 150 ms arming delay against within-step wobble.
- Foot-strike counter on raw |a| with a 250 ms refractory period, sent as bytes 8–9 (10-byte packet).
- New commands: `05` outward threshold, `06` mounting flags (invert sign / swap axes), stored in flash; calibration stores roll and pitch offsets.
- Sources cited in the sketch header and `firmware/README.md`.

### App
- Outward threshold setting (5–20°, default 10°), mounting switches (Settings → Sensor), synced to the sensor.
- Gauge, trend and sheets show both thresholds; new "Outward alerts" and "Steps" tiles (live cadence), both in the session summary and saved records.
- Protocol accepts 8-byte (v1) and 10-byte (v2) packets; strike counter wrap-around and device resets handled.
- `THIRD_PARTY_NOTICES.md`: sources of adapted code (icons, LiquidGlassKit, algorithms).

## 2026-11-04 (2) — ESP32-S3 firmware + device testing

### Firmware
- New `firmware/ashi_esp32` for the ESP32-S3-N16R8 breadboard prototype (MPU6050 + Madgwick + vibration motor), speaking the app protocol: 8-byte binary packets at 25 Hz, advertising restarts after disconnect, vibration follows the app threshold, zero calibration stored in flash.
- `npm run esp32:flash` / `esp32:monitor` / `esp32:compile` using the Arduino IDE's bundled arduino-cli.

### App
- Optional control characteristic: threshold + vibration sync, "Calibrate zero", "Test vibration" (Settings → Sensor, plus a "Set zero" shortcut on the gauge).
- Battery byte 255 = unknown (USB-powered prototype); devices that advertise the name but lack the sensor characteristic are rejected with a clear message.
- iOS: forced dark appearance (liquid glass was rendering light); fixed RRGGBBAA tint parsing (was ARGB, produced a green tab bubble).
- Android: dark base theme (dark dialogs, no white launch flash); glass view is a plain tinted view (RenderEffect only filtered its own empty content and caused edge artefacts + UI-thread load).
- Performance: static gauge SVG and Home cards are memoised; verified on iOS simulator and Android emulator (release build).

## 2026-11-04 — UI redesign + sensor-ready data layer

### Fixes
- iOS: added `NSBluetoothAlwaysUsageDescription` (the app crashed on first BLE access without it); light status bar.
- BLE packets: roll/pitch are now decoded as signed int16 and base64 is decoded binary-safe (negative angles used to show as ~650°).
- Mock data no longer runs unconditionally and is never mixed with real sensor data.
- "Start measurement" now actually starts a session; sessions can be paused, resumed and finished.
- Disconnects are detected (auto-reconnect, session auto-pauses) and connection errors are shown in the UI instead of alerts.
- Android 12+: no location permission needed for BLE scanning.

### New
- Three tabs: Live, History, Settings (liquid-glass tab bar with icons).
- Live: tilt gauge with neutral/inward/outward zones, session card with timer, metric tiles with detail sheets, 15 s trend chart.
- History: saved sessions (persisted locally) with overview, balance trend and per-session summary.
- Settings: device, auto-reconnect, inward threshold, demo mode, language, data management.
- Sensor protocol documented in `src/ble/protocol.ts`; UI updates throttled to 10 Hz regardless of sensor rate.
- Unit tests for the protocol and session engine, smoke tests for all screens.

## 2026-03-08

### db3d8ce — Home interaction + localization polish
- Improved Home metric-card interactions and popup responsiveness.
- Prevented popup opening while scrolling.
- Added modal details with chart support for ankle/stability/inward metrics.
- Localized popup content and language labels across EN/HU/DE.
- Added visualization wiring and chart store integration used by Home analytics.

### b7018a5 — Profile settings + app navigation refinements
- Added Profile screen with Settings tab.
- Added persisted language selection (EN/HU/DE).
- Localized core Home and Connect panel text.
- Improved app tab navigation and interaction smoothness.
