# 📑 ASHI Projekt - Dokumentáció Index

> **Utolsó frissítés**: 2026. március 17. | **Státusz**: 🔵 AKTÍV FEJLESZTÉS

---

## ⚡ GYORS NAVIGÁCIÓ

### 🚀 KEZDJ EBBŐL
| Fájl | Mi ez? | Kire? |
|------|--------|-------|
| **[QUICK_START.md](QUICK_START.md)** | 5 lépésben az indulás | Mindenkire - START HERE! |
| **[HELP.txt](HELP.txt)** | Gyors help center | Mindennapos kérdések |

### 📊 TELJES INFORMÁCIÓ
| Fájl | Mi ez? | Mikor? |
|------|--------|--------|
| **[PROJECT_STATUS.md](PROJECT_STATUS.md)** | Teljes projekt status | Ha meg akarod érteni |

### 🔧 SETUP ÚTMUTATÓK
| Fájl | Mi ez? | Szükséges? |
|------|--------|-----------|
| **[DATABASE_SETUP.md](DATABASE_SETUP.md)** | PostgreSQL setup lépésről lépésre | ⚠️ KRITIKUS - MOST! |
| **[iOS_BUILD.md](iOS_BUILD.md)** | iOS build Xcode-dal | iOS után |

---

## 📋 DOKUMENTÁCIÓS FÁJLOK - RÖVID LEÍRÁS

### 1. 📄 **QUICK_START.md** ⭐
**Célcsoport**: Mindanki aki gyorsan akar indulni  
**Hossz**: 2-3 perc olvasás  
**Tartalom**:
- 5 kritikus lépés
- Gyors diagnózis parancsok
- Gyors problémamegoldás

👉 **Ezt olvasd első!**

---

### 2. 📘 **PROJECT_STATUS.md**
**Célcsoport**: Fejlesztők akik meg akarják érteni a projektet  
**Hossz**: 10-15 perc olvasás  
**Tartalom**:
- Teljes architektúra diagram
- Projekt szerkezete
- Eddig elvégzett munkák
- Tennivalók listája
- Mérföldkövek

---

### 3. 🔐 **DATABASE_SETUP.md** (⚠️ FONTOSSSSS!)
**Célcsoport**: Akik beállítanák az adatbázist  
**Hossz**: 10-15 perc (+ futtatás)  
**Tartalom**:
- PostgreSQL telepítés
- Adatbázis létrehozása
- `.env` fájl
- Prisma migrations
- Hibamegoldás

👉 **Szükséges a backend indításához!**

---

### 4. 🍎 **iOS_BUILD.md**
**Célcsoport**: Akik iOS appot szeretnének buildezni  
**Hossz**: 5-10 perc olvasás  
**Tartalom**:
- Xcode setup
- Szimulator futtatása
- Meta fejlesztés
- CocoaPods
- Gyakori iOS problémák

---

### 5. 💬 **HELP.txt**
**Célcsoport**: Mindanki aki gyors válaszra van szüksége  
**Hossz**: 3-5 perc olvasás  
**Tartalom**:
- Gyors parancsok
- Gyakori hibák
- Projekt infó
- Short command reference

---

### 6. 📖 **README.md** (FRISSÍTVE)
**Célcsoport**: Standard GitHub readme  
**Tartalom**:
- React Native setup
- Új dokumentációra mutató linkek
- Step-by-step indítás


---

## 🎯 DOKUMENTÁCIÓ HASZNÁLATI MÁTRIX

| Helyzet | Javasolt Dokumentáció |
|---------|----------------------|
| "Nem tudom hol kezdjem" | QUICK_START.md |
| "Gyorsan kell segítség" | HELP.txt |
| "El akarom kezdeni az adatbázist" | DATABASE_SETUP.md |
| "iOS-t akarom buildezni" | iOS_BUILD.md |
| "Meg akarom érteni az egész projektet" | PROJECT_STATUS.md |
| "Régi setup instrukciók" | README.md |

---

## 🚀 AJÁNLOTT OLVASÁSI SORREND

**Teljesen új fejlesztő:**
1. QUICK_START.md (gyors overview)
2. DATABASE_SETUP.md (ha le akarod futtatni)
3. PROJECT_STATUS.md (ha mélyebben akarod érteni)

**iOS fejlesztéshez:**
1. QUICK_START.md
2. iOS_BUILD.md
3. DATABASE_SETUP.md (ha backend kell)

---

## 📞 GYORS LINKEK

### Parancsok
```bash
# Olvasd: QUICK_START.md
npm start
npm run backend:start:dev
npm run ios

# Teljes info: PROJECT_STATUS.md
cat PROJECT_STATUS.md

# Adatbázis setup: DATABASE_SETUP.md (MOST!)
cat DATABASE_SETUP.md
```

---

## ✅ MILYEN DOKUMENTÁCIÓ VAN?

- ✅ Beginner-friendly útmutatók
- ✅ Mélyreható technikai leírások
- ✅ Lépésről-lépésre instrukcók
- ✅ Troubleshooting guides
- ✅ Gyors referencia
- ✅ Projekt szerkezet
- ✅ Adatbázis dokumentáció

---

## 🎁 WHAT'S INSIDE?

Az összes dokumentáció tartalmazza:
- ✨ Szép formázás
- 📋 Strukturált tartalom
- 🔗 Hátsó hivatkozások
- 🛠️ Másolható parancsok
- 🆘 Hibamegoldás
- 📏 Projekt szerkezet

---

## 📞 PROJEKT INFÓ

| Info | Érték |
|------|-------|
| **Projekt** | Ashi |
| **Típus** | React Native + NestJS Full Stack |
| **Fejlesztő** | garailuca |
| **Workspace** | `/Users/garailuca/Ashi/Ashi` |
| **Status** | 🔵 AKTÍV FEJLESZTÉS |
| **Metro** | ✅ Running (port 8081) |
| **Backend** | ⏳ Awaiting DATABASE |

---

## 🔴 KRITIKUS - MOST CSINÁLD!

```bash
# Olvasd:
cat DATABASE_SETUP.md

# Csináld:
psql -U postgres -c "CREATE DATABASE stepalign;"
cat > stepalign-backend/.env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/stepalign"
EOF
npx prisma migrate deploy
```

---

**Kérdésed? → HELP.txt**  
**Gyors start? → QUICK_START.md**  
**Teljes info? → PROJECT_STATUS.md**  

---

*Dokumentáció (v1.0) | 2026. március 17.*
