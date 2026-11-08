# Ashi: átadási összefoglaló (1.0.0)

Ez a dokumentum a programozási rész lezárásához készült: mi van kész, hogyan kell elindítani,
mit ellenőriztünk, és mi maradt nyitva. A részletek a hivatkozott fájlokban vannak.

## A rendszer részei

| Rész | Hol | Leírás |
|---|---|---|
| Mobilapp (iOS + Android) | `App.tsx`, `src/` | React Native 0.73. Élő mérés, mérések rögzítése, előzmények, beállítások, felhő szinkron |
| Szenzor firmware | `firmware/ashi_esp32/` | ESP32-S3 + MPU6050 + rezgőmotor. Leírás: `firmware/README.md` |
| Backend | `stepalign-backend/` | NestJS + Prisma + PostgreSQL. Leírás: `stepalign-backend/README.md` |
| Források, licencek | `THIRD_PARTY_NOTICES.md` | Átvett kódok, ikonok, algoritmusok |
| Változások | `CHANGELOG.md` | |

## Adatfolyam

1. **Szenzor:** 100 Hz-en olvassa az MPU6050-et, Madgwick szűrővel számol bokaszöget, és számolja a
   talajfogásokat. 25 Hz-en 10 bájtos BLE csomagot küld. Befelé és kifelé dőlésnél maga rezegtet,
   telefon nélkül is.
2. **App:** fogadja a csomagokat (`src/ble/`), kiszámolja a mutatókat (`src/session/sessionEngine.ts`),
   és a befejezett mérést a telefonon tárolja.
3. **Backend:** ha a felhő szinkron be van kapcsolva, az app feltölti a méréseket a backendre
   (`src/sync/syncService.ts` → `POST /session`).

## Indítás fejlesztéshez

```bash
# 1. Backend (PostgreSQL fusson, stepalign-backend/.env: DATABASE_URL)
cd stepalign-backend && npx prisma migrate deploy && npm run build && npm run start:prod

# 2. Metro (a repo gyökeréből)
npm start

# 3. App
npm run ios        # Xcode a T7 SSD-n: DEVELOPER_DIR=/Volumes/T7/Xcode.app/Contents/Developer
npm run android

# 4. Szenzor
npm run esp32:flash && npm run esp32:monitor
```

## Ellenőrzések

| Mit | Eredmény |
|---|---|
| App tesztek (`npx jest`) | mind zöld (protokoll, session engine, lépésszám, szinkron, életciklus, képernyők) |
| TypeScript, ESLint | hibamentes |
| Backend egység- és e2e tesztek (`npm test`, `npm run test:e2e`) | mind zöld, az e2e a valódi helyi adatbázison fut |
| Firmware fordítás (`npm run esp32:compile`) | sikeres |
| Android release + debug build | sikeres |
| Android emulátor | előtérben futó szolgáltatás és értesítés mérés közben; 45 s kikapcsolt képernyő alatt is futott; szinkron a helyi backendre |
| iOS szimulátor | az 1.0.0 előtti állapot ellenőrizve. Az új natív modult (`AshiSystem.m`) még le kell fordítani: az Xcode a T7 SSD-n van, és az nem volt csatlakoztatva |

## Nyitott pontok

### Hardver nélkül nem tesztelhető
1. **Valódi BLE teszt** ESP32-vel és iPhone-nal:
   - csatlakozás;
   - PIN-es párosítás;
   - kalibrálás;
   - rezgésminták;
   - háttérben futó mérés zárolt képernyővel.

   Lépések: `firmware/README.md`.
2. **Lépésszámláló hangolása** valódi járásból. Leírás: `firmware/README.md` → „Hangolás”.
3. **iPhone-ra telepítés:** az Xcode-ban be kell állítani a Signing → Team mezőt a saját Apple ID-ddal.

### Döntést igényel
4. **LiquidGlassKit licenc:** az eredeti tárolóban nincs licenc, így a kódot jogilag nem lehet
   terjeszteni. Lehetőségek:
   - **a)** a szerzőtől licencet vagy engedélyt kérni (GitHub issue: DnV1eX/LiquidGlassKit);
   - **b)** lecserélni az Apple saját `UIGlassEffect`-jére (iOS 26+), régebbi iOS-en elmosott háttérrel.
5. **Android release és HTTP:** a release build alapból tiltja a titkosítatlan HTTP-t, ezért a helyi
   hálózati szinkron csak debug buildben megy. Lehetőségek:
   - **a)** HTTPS-es backend (ajánlott, éles üzemhez úgyis kell);
   - **b)** `network_security_config` a szerver konkrét címére szűkítve.
6. **Hitelesítés a backendhez:** most névtelen, telepítésenkénti azonosító van, bejelentkezés nincs.
   Nyilvános üzemeltetés előtt bejelentkezés és HTTPS kell.
7. **BLE PIN:** az alapértelmezett `246810` minden szenzoron ugyanaz. Gyártáskor szenzoronként
   egyedi PIN-t kell beégetni és a szenzorra írni.
