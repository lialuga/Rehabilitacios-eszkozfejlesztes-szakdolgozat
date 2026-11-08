# Rehabilitációs eszköz: bokadőlés-mérő szenzor és mobilalkalmazás

A lábra rögzített szenzor méri a boka befelé és kifelé dőlését, és rezgéssel jelez, ha a dőlés
átlépi a beállított küszöböt. A mobilalkalmazás élőben mutatja a szöget, rögzíti a méréseket, és
ha be van kapcsolva, feltölti őket a háttérszolgáltatásra.

| Rész | Mappa | Technológia |
|---|---|---|
| Mobilalkalmazás (iOS, Android) | `App.tsx`, `src/` | React Native 0.73, TypeScript |
| Szenzor firmware | `firmware/ashi_esp32/` | ESP32-S3, MPU6050, Arduino |
| Háttérszolgáltatás | `stepalign-backend/` | NestJS, Prisma, PostgreSQL |

## Előfeltételek

| Mi | Mihez kell |
|---|---|
| Node.js 18+ | minden részhez |
| JDK 17 és Android Studio, benne egy virtuális eszközzel (*Device Manager → Create device*) | Android |
| Xcode és CocoaPods | iOS |
| PostgreSQL | háttérszolgáltatás |
| Arduino IDE 2 (vagy `arduino-cli`), ESP32 board-csomag 3.3.x, *MPU6050* (Electronic Cats) és *Madgwick* (Arduino) könyvtár | firmware |

```bash
npm install
```

## Az alkalmazás elindítása (Android emulátor)

```bash
npm run app
```

A parancs elindítja az első Android virtuális eszközt (másikat így választhatsz:
`AVD=Pixel_8 npm run app`), lefordítja a release buildet, telepíti és megnyitja az alkalmazást.
Az első fordítás néhány percig tart. Ha a kód nem változott: `npm run app -- --no-build`.
Fejlesztéshez, azonnal frissülő kóddal: `npm run app:dev`.

Ha az Android SDK nem a `~/Library/Android/sdk` mappában van, állítsd be az `ANDROID_HOME` változót.

- **Szenzor nélkül:** a főképernyőn a *Kipróbálás demó adatokkal* gomb, vagy *Beállítások → Demó mód*.
  Az alkalmazás ilyenkor szimulált adatokkal ugyanúgy mér és rögzít.
- **Nyelv:** *Beállítások → Nyelv* (magyar, angol, német); alapból a telefon nyelvét követi.
- **Képernyőkép:** `npm run app:screenshot -- elo` → `screenshots/elo.png`.

## iOS

```bash
bundle install
cd ios && bundle exec pod install && cd ..
npm start          # Metro, külön terminálban
npm run ios        # szimulátor
```

Valódi iPhone-ra: `open ios/Ashi.xcworkspace`, majd az Xcode-ban a *Signing & Capabilities → Team*
mezőben a saját Apple ID, és *Run*.

## Háttérszolgáltatás (felhőszinkron)

```bash
brew install postgresql@15 && brew services start postgresql@15
psql -U postgres -c "CREATE DATABASE stepalign;"

cd stepalign-backend
npm install
cp .env.example .env          # a DATABASE_URL-be a saját felhasználónév és jelszó
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start:prod            # http://0.0.0.0:3000
```

Ellenőrzés: `curl http://localhost:3000/health` → `{"status":"ok","db":true}`.
Fejlesztéshez `npm run start:dev`; a repo gyökeréből `npm run backend:start`.

**A telefon csatlakoztatása:** a gép és a telefon legyen ugyanazon a Wi-Fin. A gép címe:
`ipconfig getifaddr en0`. Az alkalmazásban *Beállítások → Felhő szinkron → Mérések feltöltése*,
szerver: `<ip-cím>:3000`. Android release buildben a titkosítatlan HTTP tiltott, ezért ott debug
build (`npm run app:dev`) vagy HTTPS-es szerver kell.

| Metódus | Útvonal | Leírás |
|---|---|---|
| `GET` | `/health` | az API és az adatbázis állapota |
| `POST` | `/session` | mérés mentése; ugyanaz a `(userId, clientId)` frissíti a sort |
| `GET` | `/session/:userId` | a felhasználó mérései, legújabb elöl |
| `DELETE` | `/session/:userId/:clientId` | mérés törlése |

## Szenzor firmware

**Bekötés:** MPU6050 VCC → 3V3, GND → GND, SDA → GPIO 18, SCL → GPIO 17. A rezgőmotor
tranzisztoron vagy MOSFET-en keresztül a GPIO 10-ről kap jelet, párhuzamosan egy szabadonfutó
diódával.

```bash
npm run esp32:flash        # fordítás és feltöltés, a portot magától megkeresi
npm run esp32:monitor      # soros monitor, 115200 baud
```

Ha nem találja a portot: tartsd nyomva a **BOOT** gombot, nyomd meg az **RST**-t, engedd el a
BOOT-ot, és futtasd újra. Kézzel: `PORT=/dev/cu.usbmodem1101 npm run esp32:flash`.

Arduino IDE-ből: *ESP32S3 Dev Module*, USB CDC On Boot: *Enabled*, Flash Size: *16MB*,
Partition Scheme: *16M Flash (3MB APP/9.9MB FATFS)*, PSRAM: *OPI PSRAM*.

Indításkor 2–3 másodpercig tartsd mozdulatlanul a szenzort (a giroszkóp kalibrálása). A soros
monitoron ekkor `[BLE] advertising as Ashi-Sensor` jelenik meg.

**Csatlakozás az alkalmazásból:**
1. *Élő → Szenzor csatlakoztatása*.
2. A telefon PIN-kódot kér: alapból `246810` (a `.ino` elején: `BLE_PIN`). Ez csak egyszer kell.
3. *Beállítások → Eszköz → Nullpont kalibrálása*, egyenesen állva.
4. Befelé döntéskor a szögmérő jobbra tér ki. Ha balra: *Beállítások → Eszköz → Dőlésirány
   megfordítása*; ha csak előre-hátra billentésre mozdul: *Szenzor 90°-kal elforgatva*.

| Rezgésjelzés | Minta |
|---|---|
| befelé, a küszöb felett | 0,5 s be / 0,5 s ki |
| befelé, küszöb + 7° felett | 0,2 s be / 0,2 s ki |
| befelé, küszöb + 15° felett | folyamatos |
| kifelé (elesésveszély), a küszöb felett | dupla rövid rezgés |
| kifelé, küszöb + 10° felett | folyamatos |

Alapértékek: befelé 8°, kifelé 10°; mindkettő állítható az alkalmazásban (*Beállítások → Mérés*).

## Tesztek

```bash
npm test                                      # alkalmazás
npx tsc --noEmit && npm run lint
npm --prefix stepalign-backend test           # háttérszolgáltatás
npm --prefix stepalign-backend run test:e2e   # a DATABASE_URL adatbázison
npm run esp32:compile                         # firmware fordítása
```

## Külső források és licencek

A projektben minden más tárolóból származó kód, sablon és könyvtár itt van felsorolva. Az átvett
részekben az eredeti kommentek változatlanul megmaradtak.

### Átvett kód

| Hol | Forrás | Licenc |
|---|---|---|
| `src/components/Icon.tsx`, `android/.../drawable/ic_stat_ashi.xml` | Feather Icons, <https://github.com/feathericons/feather> | MIT |
| `src/components/Icon.tsx` (`footprints`) | Lucide, <https://github.com/lucide-icons/lucide> | ISC |
| `ios/vendor/LiquidGlassKit/` | LiquidGlassKit (DnV1eX), <https://github.com/DnV1eX/LiquidGlassKit> | az eredeti tárolóban nincs megadva |
| `android/.../liquidglass/LiquidGlassViewManager.kt` (shader) | Kyant0/AndroidLiquidGlass, <https://github.com/Kyant0/AndroidLiquidGlass> | lásd az eredeti tárolót |
| `src/ble/mockStream.ts` (`gaussian`) | Box–Muller-transzformáció: G. E. P. Box, M. E. Muller, *Ann. Math. Statist.* 29(2), 1958 | algoritmus |

### Projektsablonok

Ezek a fájlok a keretrendszerek projektgenerátorából indultak; a sablon kommentjei bennük maradtak.

| Hol | Forrás | Licenc |
|---|---|---|
| `index.js`, `metro.config.js`, `__tests__/App.test.tsx`, `Gemfile`, `.gitignore`, `android/` (Gradle-fájlok, `MainActivity.kt`, `MainApplication.kt`, `rn_edit_text_material.xml`), `ios/` (`Podfile`, `.xcode.env`, `AppDelegate.*`, `main.m`, `AshiTests.m`, Xcode-projekt) | React Native 0.73 projektsablon, <https://github.com/facebook/react-native> | MIT |
| `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/` | Gradle Wrapper, <https://github.com/gradle/gradle> | Apache-2.0 |
| `stepalign-backend/` alapváza (`eslint.config.mjs`, `test/`, `tsconfig*.json`, `nest-cli.json`) | NestJS alkalmazássablon, <https://github.com/nestjs/schematics> | MIT |
| `stepalign-backend/prisma/schema.prisma` fejléce, `prisma.config.ts`, `prisma/migrations/` | Prisma (`prisma init`, `prisma migrate`), <https://github.com/prisma/prisma> | Apache-2.0 |

### A firmware-ben `[S…]` jelöléssel hivatkozott források

| | Forrás | Licenc |
|---|---|---|
| S2 | Electronic Cats MPU6050 1.4.4, <https://github.com/ElectronicCats/mpu6050> | MIT |
| S3 | Arduino MadgwickAHRS 1.2.0, <https://github.com/arduino-libraries/MadgwickAHRS>; S. O. H. Madgwick, *An efficient orientation filter for inertial and inertial/magnetic sensor arrays*, 2010 | GPL (a könyvtár fejléce szerint) |
| S5 | x-io Technologies Fusion, <https://github.com/xioTechnologies/Fusion> (csak az ötlet, kód nincs átvéve) | – |
| S6, S8 | Espressif Arduino-ESP32 3.3.x és BLE példái (*Server*, *Notify*, *Server_secure_static_passkey*), <https://github.com/espressif/arduino-esp32> | LGPL-2.1 |

### Felhasznált könyvtárak

Ezek függőségként települnek (`npm install`, `pod install`, Gradle), a kódjuk nincs a tárolóban.
A fejlesztői eszközök (TypeScript, ESLint, Prettier, Jest, Babel) a `package.json` fájlok
`devDependencies` részében szerepelnek.

| Könyvtár | Verzió | Forrás | Licenc |
|---|---|---|---|
| React | 18.2.0 | <https://github.com/facebook/react> | MIT |
| React Native | 0.73.8 | <https://github.com/facebook/react-native> | MIT |
| react-native-ble-plx | 3.5.1 | <https://github.com/dotintent/react-native-ble-plx> | MIT |
| @react-native-async-storage/async-storage | 1.23.1 | <https://github.com/react-native-async-storage/async-storage> | MIT |
| react-native-base64 | 0.2.2 | <https://github.com/eranbo/react-native-base64> | MIT |
| react-native-draggable-flatlist | 4.0.3 | <https://github.com/computerjazz/react-native-draggable-flatlist> | MIT |
| react-native-gesture-handler | 2.14.0 | <https://github.com/software-mansion/react-native-gesture-handler> | MIT |
| react-native-reanimated | 3.10.1 | <https://github.com/software-mansion/react-native-reanimated> | MIT |
| react-native-linear-gradient | 2.8.3 | <https://github.com/react-native-linear-gradient/react-native-linear-gradient> | MIT |
| react-native-svg | 13.14.0 | <https://github.com/software-mansion/react-native-svg> | MIT |
| victory-native | 36.6.8 | <https://github.com/FormidableLabs/victory> | MIT |
| zustand | 5.0.11 | <https://github.com/pmndrs/zustand> | MIT |
| NestJS (`@nestjs/common`, `core`, `platform-express`) | 11.1.16 | <https://github.com/nestjs/nest> | MIT |
| @nestjs/config | 4.0.3 | <https://github.com/nestjs/config> | MIT |
| Prisma (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) | 7.4.2 | <https://github.com/prisma/prisma> | Apache-2.0 |
| node-postgres (`pg`) | 8.20.0 | <https://github.com/brianc/node-postgres> | MIT |
| class-validator | 0.15.1 | <https://github.com/typestack/class-validator> | MIT |
| class-transformer | 0.5.1 | <https://github.com/typestack/class-transformer> | MIT |
| reflect-metadata | 0.2.2 | <https://github.com/rbuckton/reflect-metadata> | Apache-2.0 |
| RxJS | 7.8.2 | <https://github.com/ReactiveX/rxjs> | Apache-2.0 |
| MPU6050 (Electronic Cats), MadgwickAHRS, Arduino-ESP32 | lásd fent (S2, S3, S6) | | |
