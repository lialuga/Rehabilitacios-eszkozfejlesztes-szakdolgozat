# Ashi szenzor firmware (ESP32-S3 + MPU6050)

A `ashi_esp32/ashi_esp32.ino` a breadboardos ESP32-S3-N16R8 prototípus firmware-je.
A régi `esp32-1.dev` sketch szenzorlogikáját (MPU6050 + Madgwick + rezgőmotor) viszi tovább,
de az Ashi app BLE protokollját beszéli.

## Mi változott a régi sketch-hez képest

| | Régi (`esp32-1.dev`) | Új (`ashi_esp32`) |
|---|---|---|
| BLE név | `RehabTracker` | `Ashi-Sensor` |
| UUID-k | példa UUID-k | az app UUID-jai (`src/ble/protocol.ts`) |
| Adat | JSON szöveg, 100 Hz, ~100 bájt (levágódik 20 bájtnál) | 8 bájtos bináris csomag, 25 Hz |
| Bontás után | nem hirdet újra, a telefon nem tud visszacsatlakozni | automatikusan újra hirdet |
| Rezgés | fix 10/20/30° \|roll\|, mindkét irányban azonos | befelé és kifelé külön küszöb (appból), kifelé eltérő dupla rezgés, 150 ms késleltetés a rövid kilengések ellen |
| Kalibrálás | nincs | „Nullpont kalibrálása” az appból, flash-be mentve (roll és pitch) |
| Felszerelés | `ROLL_SIGN` átírása + újrafeltöltés | „Dőlésirány megfordítása” / „Szenzor 90°-kal elforgatva” az appból |
| MPU hiba | csendben 0-kat küld | soros porton hibát ír, nem küld szemetet |
| Méréshatár | ±2 g / ±250 °/s (lépéskor telítődik) | ±8 g / ±1000 °/s |
| Szűrés | gyorsulás és giroszkóp is aluláteresztő (késik) | csak a gyorsulás enyhén szűrt, a giroszkóp nyers |
| Becsapódás | a gyorsulásmérő elhúzza a szöget | 0,85–1,15 g-n kívül csak a giroszkóp számít |
| Időzítés | fix 100 Hz-et feltételez | a valóban eltelt időt használja |
| Indulás | a szög másodpercekig „úszik be” | a szűrő azonnal a valós szögről indul |
| Lépés | szűrt gyorsulásból, két lépés közti minimum nélkül | nyers \|a\|-ból, min. 250 ms két lépés között, elküldve az appnak |

## Bekötés

| MPU6050 | ESP32-S3 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO 18 |
| SCL | GPIO 17 |

A rezgőmotor **tranzisztoron/MOSFET-en keresztül** menjen a GPIO 10-ről (a GPIO lábat ne terheld
közvetlenül a motorral), a motorral párhuzamosan legyen egy szabadonfutó dióda.

## Feltöltés

### A) Parancssorból (ajánlott)

```bash
# ESP32 bedugva USB-n (a „USB” feliratú porton)
npm run esp32:flash        # fordít + feltölt, a portot magától megtalálja
npm run esp32:monitor      # soros monitor, 115200 baud
```

Ha nem találja a portot: tartsd nyomva a **BOOT** gombot, nyomd meg a **RST**-t, engedd el a BOOT-ot,
és futtasd újra. Másik port kézzel: `PORT=/dev/cu.usbmodem1101 npm run esp32:flash`.

### B) Arduino IDE-ből

1. Nyisd meg: `firmware/ashi_esp32/ashi_esp32.ino`
2. Board: **ESP32S3 Dev Module**
3. Tools menü:
   - USB CDC On Boot: **Enabled**
   - Flash Size: **16MB (128Mb)**
   - Partition Scheme: **16M Flash (3MB APP/9.9MB FATFS)**
   - PSRAM: **OPI PSRAM**
4. Könyvtárak (már telepítve vannak): *MPU6050* (Electronic Cats), *Madgwick* (Arduino)
5. Upload

## Ellenőrzés a soros monitoron

Indulás után ezt kell látnod:

```
=== Ashi sensor v2.0 ===
[CFG] in=8 out=10 vibration=1 offsets=0.00/0.00 mount=0x00
[IMU] calibrating, keep the sensor still...
[IMU] gyro bias 12.3 -40.1 5.2 LSB, gravity 0.02 -0.01 1.00 g
[IMU] filter ready, roll 0.4 pitch -1.1
[BLE] advertising as Ashi-Sensor
tilt:0.42 pitch:-1.10 in:8 out:-10 acc:1.01 strikes:0 gated:0 connected:0
```

A sor mezői (a Serial Plotter görbeként rajzolja őket):

| mező | jelentés |
|---|---|
| `tilt` | bokadőlés, + = befelé |
| `in` / `out` | befelé / kifelé küszöb (vízszintes vonalként látszik) |
| `acc` | a gyorsulás csúcsa az előző sor óta (g); a lépésküszöb hangolásához |
| `strikes` | talajfogások száma (a szenzoros láb) |
| `gated` | a minták hány %-ában hagyta figyelmen kívül a gyorsulásmérőt (becsapódás) |

Az indulás alatt **2–3 másodpercig tartsd mozdulatlanul** a szenzort (giroszkóp-kalibrálás).
Ha `MPU6050 NOT FOUND` jön, a bekötéssel van gond.

## Csatlakozás az appból

1. App → **Élő** → **Szenzor csatlakoztatása** (iOS-en engedélyezd a Bluetooth-t az első alkalommal).
2. Ha megjelenik az „Ashi-Sensor”, a soros monitoron `[BLE] phone connected` látszik.
3. **Párosítás (PIN):** a telefon egy Bluetooth-párosítási kérést dob fel. Írd be a szenzor PIN-kódját
   (alapból `246810`, a `.ino` elején: `BLE_PIN`; a soros monitor is kiírja). Ez csak egyszer kell,
   utána a telefon megjegyzi. A PIN a vezérlő csatornát védi (küszöbök, kalibrálás, felszerelés),
   így más telefon nem tudja átállítani a szenzort. A szögadatok párosítás nélkül is jönnek.
   - Ha elutasítod vagy elrontod, az app a Beállítások → Szenzor kártyán jelzi; **Újra** gomb.
   - **Minden szenzornál változtasd meg a `BLE_PIN`-t** (6 számjegy), és írd rá a szenzorra.
   - Ha a firmware-t teljes flash-törléssel töltöd újra, a szenzor elfelejti a párosítást, a telefon
     viszont nem: iPhone-on Beállítások → Bluetooth → Ashi-Sensor → (i) → **Eszköz elfelejtése**,
     Androidon a párosított eszközök közül törlés, majd csatlakozz újra.
   - A PIN kikapcsolható: `#define BLE_REQUIRE_PIN 0`.
4. **Beállítások → Szenzor → Nullpont kalibrálása**: állj egyenesen, a talp legyen a földön, és koppints.
   Ez a helyzet lesz a 0°. Az érték a flash-ben marad, újraindítás után is.
5. **Rezgés tesztelése**: a motornak rövid rezgést kell adnia.
6. Döntsd befelé a lábat: a szögmérőnek **jobbra (Befelé)** kell kitérnie.
   - Ha balra tér ki: **Beállítások → Szenzor → Dőlésirány megfordítása** (másik láb vagy fordított panel).
   - Ha oldalra döntésre alig mozdul, de előre-hátra billentésre igen: **Szenzor 90°-kal elforgatva**.
   - Mindkettő a szenzor flash-ébe mentődik, újrafeltöltés nem kell. Utána kalibrálj újra.

## Rezgésjelzések

| Helyzet | Minta |
|---|---|
| Befelé, küszöb felett | 0,5 s be / 0,5 s ki |
| Befelé, küszöb + 7° felett | 0,2 s be / 0,2 s ki |
| Befelé, küszöb + 15° felett | folyamatos |
| **Kifelé** (elesésveszély), küszöb felett | **dupla rövid rezgés** ~0,7 s-onként |
| **Kifelé**, küszöb + 10° felett | folyamatos |

A rezgés csak akkor indul, ha a dőlés legalább 150 ms-ig a küszöbön túl marad, és azonnal leáll,
amint a láb visszatér (0,5° hiszterézissel). Alapértékek: befelé 8°, kifelé 10°, mindkettő állítható
az appban (Beállítások → Mérés).

## Hangolás valódi járás alapján

A konstansok a `.ino` elején vannak (`STEP_HIGH_G`, `STEP_LOW_G`, `STEP_MIN_INTERVAL_MS`,
`ACC_GATE_MIN_G/MAX_G`, `VIB_ARM_MS`). Javasolt menet:

1. `npm run esp32:monitor`, vagy Arduino IDE → Serial Plotter, 115200 baud.
2. Sétálj 20 lépést, és nézd a `strikes` értéket: a szenzoros lábon ~10-et kell számolnia.
   - Ha többet számol: emeld a `STEP_HIGH_G`-t (pl. 1.5), vagy a `STEP_MIN_INTERVAL_MS`-t (pl. 350).
   - Ha kevesebbet: csökkentsd a `STEP_HIGH_G`-t (pl. 1.2).
3. Az `acc` csúcsok mutatják, mekkora a sarok-becsapódás; a küszöb ennél legyen kisebb, de
   az álló helyzet ~1,0 g-jánál jóval nagyobb.

## Akkumulátor (opcionális)

USB-ről táplálva az app „ismeretlen” akkut mutat. 1 cellás LiPo esetén:

1. Feszültségosztó: VBAT → 100 kΩ → **GPIO 4** → 100 kΩ → GND (az ESP32-S3 ADC1 lába).
2. A `.ino`-ban: `#define BATTERY_PIN 4`.
3. A firmware 16 mintát átlagol, lassan simít (a motor rezgése alatt leeső feszültség ne ugráltassa),
   és 3,3 V (0%) – 4,2 V (100%) között lineárisan becsül.

## PCB-s változat

A lábkiosztás a `.ino` elején, board-profilokban van (`BOARD_BREADBOARD_S3`, `BOARD_PCB`).
Ha a PCB elkészül: töltsd ki a `BOARD_PCB` ág lábait a kapcsolási rajz alapján, töröld az `#error`
sort, és állítsd `#define BOARD BOARD_PCB`-re. A firmware többi része változatlan marad.
Ha a PCB nem ESP32-es (pl. más BLE-chip), a BLE-réteget kell átírni, a szenzor- és rezgéslogika
akkor is újrahasznosítható.

## Hibakeresés

| Tünet | Megoldás |
|---|---|
| Az app nem találja | Fut a firmware? (`[BLE] advertising` a monitoron.) Nincs másik telefonhoz csatlakozva? iOS-en: Beállítások → Ashi → Bluetooth engedélyezve? |
| „…nem az Ashi protokollt használja” | A régi `RehabTracker` sketch van a lapon, töltsd fel az újat. |
| Csatlakozik, de „Nincs adat” | MPU hiba (nézd a soros monitort), vagy laza SDA/SCL vezeték. |
| A szög lassan elmászik | Indításkor mozdult a szenzor a giró-kalibrálás alatt; indítsd újra mozdulatlanul. |
| A szög előjele fordított | App → Beállítások → Szenzor → **Dőlésirány megfordítása** |
| „Párosítás szükséges” az appban | Írd be a `BLE_PIN`-t a telefon kérésére, majd **Újra**. Ha nem kér PIN-t: felejtsd el az eszközt a telefon Bluetooth-beállításaiban. |
| Csatlakozik, de a beállítások nem mentődnek | Párosítás hiányzik (lásd fent), vagy régi firmware. |

## Protokoll röviden

- **Service:** `12345678-1234-5678-1234-56789abcdef0`
- **Szenzor (NOTIFY, 10 bájt, big-endian):** `int16 roll×100 | int16 pitch×100 | uint16 stabilitás | uint8 befelé% | uint8 akku% (255 = ismeretlen) | uint16 talajfogások`
  (a v1-es 8 bájtos csomagot az app továbbra is elfogadja, akkor nincs lépésszám)
- **Vezérlés (WRITE):** `01 <fok>` befelé küszöb, `02` kalibrálás, `03 <0|1>` rezgés ki/be, `04` teszt-rezgés,
  `05 <fok>` kifelé küszöb, `06 <bitek>` felszerelés (bit0 irány megfordítása, bit1 tengelycsere)

Az app a lépésszámot a talajfogások ×2-eként mutatja, mert a szenzor csak az egyik lábon van.

A részletes leírás az app oldalán: `src/ble/protocol.ts`.

## Források

A kódban `[S1]`–`[S7]` jelöléssel hivatkozott források (részletesen a `.ino` fejlécében):

| | Forrás | Mire használjuk |
|---|---|---|
| S1 | Saját prototípus: `~/Documents/Arduino/esp32-1.dev/esp32-1.dev.ino` | lábkiosztás, Madgwick-lánc, lépés-hiszterézis (1,3 g / 1,1 g), fokozódó rezgés ötlete |
| S2 | Electronic Cats MPU6050 könyvtár 1.4.4: <https://github.com/ElectronicCats/mpu6050> | szenzor inicializálás, méréshatár, DLPF, nyers adat olvasása |
| S3 | Arduino MadgwickAHRS 1.2.0: <https://github.com/arduino-libraries/MadgwickAHRS>; az algoritmus: S. O. H. Madgwick, *An efficient orientation filter for inertial and inertial/magnetic sensor arrays*, 2010; <http://www.x-io.co.uk/open-source-imu-and-ahrs-algorithms/> | orientáció-becslés; `begin()` = mintavételi idő, nullás gyorsulás = csak giroszkóp |
| S4 | InvenSense *MPU-6000/MPU-6050 Register Map and Descriptions* (RM-MPU-6000A-00, rev. 4.2), 27–28. regiszter | skálázás: ±8 g → 4096 LSB/g, ±1000 °/s → 32,8 LSB/(°/s) |
| S5 | x-io Technologies *Fusion*: <https://github.com/xioTechnologies/Fusion> („acceleration rejection”) | ötlet: becsapódáskor a gyorsulásmérő kihagyása (kód nincs átvéve) |
| S6 | Espressif Arduino-ESP32 BLE példák (*Server*, *Notify*): <https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE/examples> | BLE szerver, notify, hirdetés felépítése |
| S8 | Espressif *Server_secure_static_passkey* példa (ugyanott, mint S6) | PIN-es párosítás (`BLESecurity`) |
| S9 | Espressif Arduino-ESP32 ADC API: <https://docs.espressif.com/projects/arduino-esp32/en/latest/api/adc.html> | kalibrált `analogReadMilliVolts()` az akkumulátorhoz |
| S7 | N. Zhao: *Full-Featured Pedometer Design Realized with 3-Axis Digital Accelerometer*, Analog Dialogue 44-06, Analog Devices, 2010 | küszöb + minimális lépésköz elve (kód nincs átvéve) |
