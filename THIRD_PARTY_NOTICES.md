# Third-party sources

Code, assets and algorithms in this repository that come from, or are adapted from, external
sources. Regular npm / CocoaPods / Gradle dependencies are listed in `package.json`,
`ios/Podfile.lock` and `android/app/build.gradle` and keep their own licences.

## App

| Where | Source | Licence | Notes |
|---|---|---|---|
| `src/components/Icon.tsx` | Feather Icons, <https://github.com/feathericons/feather> | MIT | Stroke paths of most icons (list in the file header) |
| `src/components/Icon.tsx` (`footprints`) | Lucide, <https://lucide.dev/icons/footprints> | ISC | Icon path |
| `ios/vendor/LiquidGlassKit/` | LiquidGlassKit by DnV1eX, <https://github.com/DnV1eX/LiquidGlassKit> | **none** | ⚠️ The upstream repository has no licence (GitHub API `"license": null`, no LICENSE file; checked 2026-11-04). An earlier podspec here wrongly said MIT. Without a licence the code may not be redistributed or shipped. Before release, either get written permission / a licence from the author, or replace it (e.g. with Apple's public `UIGlassEffect` on iOS 26). |
| `android/app/src/main/res/drawable/ic_stat_ashi.xml` | Feather Icons "activity", <https://github.com/feathericons/feather> | MIT | Notification icon |
| `android/.../system/SessionForegroundService.kt` | Android developer guide "Foreground services", <https://developer.android.com/develop/background-work/services/fgs> | – (documentation) | Structure of a `connectedDevice` foreground service; own code |
| `src/ble/mockStream.ts` (`gaussian`) | Box–Muller transform: G. E. P. Box, M. E. Muller, *A Note on the Generation of Random Normal Deviates*, Ann. Math. Statist. 29(2), 1958 | – (algorithm) | Own implementation |

## Firmware (`firmware/ashi_esp32`)

See the `[S1]`–`[S9]` list in the sketch header and the "Források" section of
`firmware/README.md`. Libraries used:

| Library | Source | Licence |
|---|---|---|
| MPU6050 (Electronic Cats) 1.4.4 | <https://github.com/ElectronicCats/mpu6050> | MIT (LICENSE file in the library) |
| Madgwick (Arduino) 1.2.0 | <https://github.com/arduino-libraries/MadgwickAHRS> | algorithm by S. Madgwick / x-io Technologies, released under the GPL per the library header |
| Arduino-ESP32 core 3.3.8 (BLE, Preferences, Wire) | <https://github.com/espressif/arduino-esp32> | LGPL-2.1 |
