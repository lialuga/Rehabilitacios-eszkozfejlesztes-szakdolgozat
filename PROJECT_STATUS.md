# 🏗️ ASHI Projekt - Teljes Dokumentáció & Status

**Projekt Neve:** Ashi (a rövid név: stepalign)  
**Típus:** Full-stack React Native + NestJS alkalmazás  
**Célja:** BLE szenzorok monitorozása valós idejű adatmegjelenítéssel  
**Kezdési dátum:** 2026. március 17.

---

## 📱 PROJEKT ARCHITEKTÚRA

```
┌─────────────────────────────────────┐
│   React Native Mobile App (Ashi)    │
│  ├─ iOS (Xcode - macOS T7 SSD-en)   │
│  ├─ Android (Gradle)                │
│  └─ BLE kommunikáció                │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│  NestJS Backend (stepalign-backend)  │
│  ├─ Port: 3000                       │
│  ├─ API endpoints                    │
│  └─ Business logic                   │
└──────────────┬──────────────────────┘
               │ Prisma ORM
┌──────────────▼──────────────────────┐
│    PostgreSQL Database               │
│   ├─ Users                           │
│   ├─ Sessions                        │
│   └─ Sensor Samples                  │
└──────────────────────────────────────┘
```

---

## ✅ EDDIG ELVÉGZETT LÉPÉSEK

### 1. **Projekt Felderítése (✅ KÉSZ)**
- [x] Projekt szerkezetének megértése
- [x] package.json analízis
- [x] Frontend: React Native 0.73.8, TypeScript
- [x] Backend: NestJS 11.x, Prisma ORM
- [x] Adatmodell: Users → Sessions → Samples

### 2. **Frontend Státusz (✅ KÉSZ)**
- [x] Függőségek telepítve (node_modules létezik)
- [x] Metro szerver sikeresen fut (port 8081)
- [x] Fejlesztési környezet működik
- [x] App.tsx alapvetően konfigurálva
- [x] Komponensek szerkezete meglétezik:
  - Screens: HomeScreen, DashboardScreen, ProfileScreen
  - Components: AngleDisplay, ChartDisplay, DeviceStatus, ConnectionPanel
  - Stores: deviceStore, chartStore, deviceStore, languageStore (Zustand)
  - BLE Service: bleService.ts, mockStream.ts
  - Visualization: visualizationEngine.ts
  - i18n: Többnyelvű támogatás (HU, EN)

### 3. **Backend Előkészítés (⚠️ RÉSZBEN)**
- [x] NestJS projekt létezik
- [x] Prisma schema definiálva:
  - User modell (email)
  - Session modell (stabilityAvg, inwardRatio, balanceScore)
  - Sample modell (roll, stability, inward szenzoradatok)
- [ ] ❌ .env fájl hiányzik
- [ ] ❌ PostgreSQL nincs beállítva
- [ ] ❌ Prisma migrations nincsenek futtatva

---

## 🚨 JELENLEGI PROBLÉMÁK

### Problem #1: Adatbázis nincs beállítva
**Status:** ⚠️ KRITIKUS  
**Oka:** `stepalign-backend/.env` fájl hiányzik, DATABASE_URL nincs definiálva  
**Hatás:** Backend nem tud indulni

**Megoldás szükséges:**
```bash
1. PostgreSQL szervert elindítani vagy ellenőrizni
2. 'stepalign' adatbázis létrehozása
3. .env fájl létrehozása DATABASE_URL-del
4. Prisma migrations futtatása
```

---

## 📋 TENNIVALÓ LISTA - TELJES MAPPA

### FÁZIS 1: Adatbázis Setup (JELENLEG)
- [ ] PostgreSQL telepítés/verifikálás
- [ ] `stepalign` adatbázis létrehozása
- [ ] `.env` fájl létrehozása
- [ ] Prisma migrations: `npx prisma migrate deploy`
- [ ] Adatbázis verifikálása

### FÁZIS 2: Backend Indítása
- [ ] Backend inicializálása: `npm run backend:start:dev`
- [ ] API health check
- [ ] Seed data (opcionális)

### FÁZIS 3: iOS Build
- [ ] Xcode (T7 SSD-ről) elindítása
- [ ] iOS projekt beépítése
- [ ] Pod install (CocoaPods) futtatása
- [ ] iOS szimulátorban vagy fizikai eszközön tesztelés

### FÁZIS 4: Android Build (Opcionális)
- [ ] Android Gradle beépítés
- [ ] Emulátor/eszköz tesztelés

### FÁZIS 5: Integráció Teszt
- [ ] Frontend + Backend kapcsolat
- [ ] BLE eszköz szimulálása
- [ ] Adat flow ellenőrzése

---

## 🔧 GYORS REFERENCIA - PARANCSOK

### **Frontend (React Native)**
```bash
npm start              # Metro szerver indítása (port 8081) ✅ CSINÁLTUK
npm run ios            # iOS szimulátorban futtatás
npm run android        # Android emulátorban futtatás
npm run lint           # ESLint futtatása
npm test               # Jest tesztek
```

### **Backend (NestJS)**
```bash
npm --prefix stepalign-backend install
npm run backend:start:dev      # Development módban (port 3000)
npm run backend:build          # Production build
npx prisma migrate deploy      # Adatbázis migrálás
npx prisma studio             # Adatbázis UI
```

### **Teljes Stack**
```bash
npm run dev:all        # Minden indítása (ha .env meglétezik)
npm run dev:all --dry-run  # Preview nélküli indítás
```

---

## 📦 PROJEKT FÜGGŐSÉGEK ÖZET

### Frontend Dependencies
- `react-native@0.73.8`
- `react-native-ble-plx@^3.5.1` - Bluetooth
- `react-native-reanimated@^3.10.1` - Animációk
- `zustand@^5.0.11` - State management
- `victory-native@^36.6.8` - Charting
- `@react-native-async-storage/async-storage@^1.23.1` - Local storage

### Backend Dependencies
- `@nestjs/core@^11.0.1`
- `@prisma/client@^7.4.2`
- `pg@^8.20.0` - PostgreSQL driver

---

## 🎯 KÖVETKEZŐ LÉPÉS: ADATBÁZIS SETUP

### Egyre kell csinálni:

1. **PostgreSQL státusz ellenőrzése**
   ```bash
   psql --version
   # vagy
   brew info postgres
   ```

2. **Adatbázis létrehozása**
   ```bash
   psql -U postgres -c "CREATE DATABASE stepalign;"
   ```

3. **Backend `.env` fájl**
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/stepalign"
   ```

4. **Prisma Migration**
   ```bash
   npx prisma migrate deploy --schema stepalign-backend/prisma/schema.prisma
   ```

5. **Backend indítása**
   ```bash
   npm run backend:start:dev
   ```

6. **iOS build (Xcode-ból)**
   ```bash
   npm run ios
   ```

---

## 📊 PROJEKT MÉRFÖLDKÖVEK

| Fázis | Státusz | Ismertető |
|-------|---------|-----------|
| Frontend Setup | ✅ KÉSZ | Metro fut, komponensek vannak |
| Backend Setup | ⚠️ FÜGGŐ | Adatbázis kell előbb |
| Android Support | 📋 PENDING | Később |
| iOS Support | ⏳ NASTĘPNY | T7 Xcode-dal |
| BLE Integration | 📋 PENDING | Szenzor kezelés |
| Production Deploy | 📋 PENDING | Később |

---

## 👤 KAPCSOLÓDÓ INFORMÁCIÓK

- **Fejlesztő**: garailuca
- **Workspace**: `/Users/garailuca/Ashi/Ashi`
- **Xcode helye**: T7 nevű külső SSD
- **Dátum**: 2026. március 17.

---

**Utolsó frissítés**: 2026.03.17 - Logger AI dokumentáció  
**Státusz**: 🔵 AKTÍV FEJLESZTÉS - Adatbázis setup szükséges
