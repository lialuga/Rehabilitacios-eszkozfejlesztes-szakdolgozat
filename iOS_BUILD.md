# 🍎 iOS Build & Xcode Útmutató

## ELŐFELTÉTELEK

- ✅ **Xcode**: T7 nevű külső SSD-n meglétezik
- ✅ **Metro szerver**: Futnia kell (`npm start`)
- ✅ **Node.js**: Telepítve
- ✅ **Frontend**: Függőségek telepítve (`node_modules`)

---

## 🚀 iOS FUTTATÁSA

### LEGEGYSZERŰBB: Egy parancs

```bash
npm run ios
```

Ez automatikusan:
1. iOS szimulátort elindítja
2. Buildet készít
3. App-ot installál és futtatja

---

### LÉPÉSRŐL LÉPÉSRE (Ha szükséges)

#### 1️⃣ Pod Dependencies Telepítése

```bash
cd ios
pod install
cd ..
```

#### 2️⃣ Metro Servidor Indítása (ELŐ KELL FUTNIA)

Egy **új terminálban**:
```bash
npm start
# Output: "Dev server ready" és menü (i/a/d/r)
```

#### 3️⃣ iOS Build a Simulatoron

Egy **másik terminálban**:
```bash
npm run ios
```

---

## 🔧 XCODE KÖZVETLENÜL

Ha szeretnéd közvetlenül Xcode-ból nyitni:

```bash
# Xcode munkaterület megnyitása
open ios/Ashi.xcworkspace
```

**FONTOS**: `.xcworkspace` fájl megnyitása, NEM `.xcodeproj`!

Xcode-ban:
1. Válaszd ki az **iPhone szimulátort** (felül)
2. Kattints a **▶ Play** gombra
3. Vagy: `Cmd + R`

---

## 📱 SZIMULATOR VEZÉRLÉS

| Gomb | Funkció |
|------|---------|
| `Cmd + L` | Device list |
| `Cmd + K` | Keyboard toggle |
| `Cmd + T` | Toolbar toggle |
| `Cmd + I` | iOS version select |

---

## FEJLESZTŐI MENÜ (METRO)

Ha a Metro szerver fut, az app-ban lenyomsz **3 ujjadat egyszerre**, megjelenik a dev menu:

```
┌─────────────────────────┐
│ RN Dev Menu             │
├─────────────────────────┤
│ ⟲ Reload                │
│ 🔴 Start Debugger       │
│ 🔴 Start Profiler       │
│ 📋 Show Inspector       │
│ ✕ Close Menu            │
└─────────────────────────┘
```

---

## 🐛 GYAKORI PROBLÉMÁK

### Problem 1: "Metro server not running"
```bash
✅ FIX: Egy új terminálban
npm start
```

### Problem 2: "Metro port already in use"
```bash
✅ FIX: Port felszabadítása
lsof -ti:8081 | xargs kill -9
npm start
```

### Problem 3: "Pod install fails"
```bash
✅ FIX: CocoaPods cache tisztítása
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Problem 4: "No devices available / Simulator won't launch"
```bash
✅ FIX: Simulator indítása eszközkezelőből
open -a Simulator

# Vagy Xcode-ból: Window > Devices and Simulators > + > iPhone 15 > Create
```

### Problem 5: "Build failure - header files"
```bash
✅ FIX: Rebuild from scratch
cd ios
rm -rf build
cd ..
npm run ios
```

### Problem 6: "Red screen with error"
Nézd meg a Metro szerver outputot: lehet, hogy JavaScript szintaxis hiba van.

---

## 📊 BUILD TÍPUSOK

### Development (alapértelmezett)
```bash
npm run ios
```
- Hot reload támogatott
- Debuggable
- Nagyobb fájl

### Release (Production-like)
```bash
cd ios
xcodebuild -workspace Ashi.xcworkspace \
  -scheme Ashi \
  -configuration Release \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build
cd ..
```

---

## 🔗 XCODE DEBUGGER

Xcode-ban beépített debugger:

1. **Breakpoint**: Kattints a sorszám mellett
2. **Variables**: Alulnézet az app futásakor
3. **Console**: `Cmd + Shift + C` (kimenat lásd)

---

## ✅ ELLENŐRZÉS LÉPÉSEK

| Lépés | Mi várható |
|-------|-----------|
| `npm start` futó | "Dev server ready" + menü |
| `npm run ios` | Szimulator elindul, app megjelenik |
| Dev menu (3 ujj) | Menu megjelenik app-ban |
| Reload (`r` Metro) | App frissül |

---

## 📝 FIZIKAI ESZKÖZ TESZTELÉSE

Ha iPhone/iPad van:

1. **USB-n csatlakoztatva** (vagy ugyanaz WiFi-n)
2. **Xcode** > **Window** > **Devices and Simulators**
3. Szervezet megjelenik az eszköz listán
4. Trust az eszközön: **Setting** > **General** > **Trust**
5. Xcode-ban válaszd az eszközt dropdown-ból
6. Kattints Play-re buildezéshez

---

## 🎯 TELJES WORKFLOW

```bash
# Terminal 1: Metro
npm start
# Vár: "Dev server ready"

# Terminal 2: iOS App
npm run ios
# Szimulator elindul, app fut

# Terminal 3 (opcionális): Backend
npm run backend:start:dev
# Backend a 3000-es porton
```

Onnantól:
- `r` a Metro menüben = app reload
- `i` a Metro menüben = iOS debug menu
- Szerkesztetted meg a kódot? **Automatikus reload** hot reload miatt!

---

## 🚀 TELJES STACK (iOS + Backend)

```bash
npm run dev:all
```

Ez megnyitja 3 Terminal ablakot (macOS):
1. Backend (port 3000)
2. Metro (port 8081)
3. Tunnel (ezpost)

---

**Kész?** 🎉 Az app az iOS szimulátorban fut!
