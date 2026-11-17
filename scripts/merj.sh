#!/usr/bin/env bash
S_DIR="$(cd "$(dirname "$0")" && pwd)"
M="python3 $S_DIR/meres.py"
cd "${MERES_DIR:-$PWD}" || exit 1
L="${L:-300}"
var() { read -r -p "$1 (Enter: indulás) " _; }
irany() { python3 -c "import csv,sys; y=[float(r['tilt']) for f in sys.argv[1:] for r in csv.DictReader(open(f))]; print('ki' if -min(y) > max(y) else 'be')" "$@"; }
kuszob_ki() { f=(); for x in kuszob.csv kuszob_rovid.csv; do [[ -e $x ]] && f+=("$x"); done; ((${#f[@]})) && $M kuszob --irany "$(irany "${f[@]}")" "${f[@]}"; }

case "${1:-}" in
  nez)
    $M nez ;;
  kalibral)
    var "Fektesd laposan a deszkát, ne érj hozzá."
    $M kalibral ;;
  statikus)
    mkdir -p selejt
    echo "Deszkahossz (felfekvés–alátét): $L mm. Ehhez: 5° ≈ $(python3 -c "import math;print(round($L*math.sin(math.radians(5))))") mm, 10° ≈ $(python3 -c "import math;print(round($L*math.sin(math.radians(10))))") mm, 15° ≈ $(python3 -c "import math;print(round($L*math.sin(math.radians(15))))") mm alátét."
    echo "Szögenként 3 ismétlés: két ismétlés között vedd le a deszkát az alátétről, és tedd vissza ugyanoda."
    echo "A másik irányhoz a deszka MÁSIK végét emeld meg. Az irányt és a sorszámot a program magától adja."
    while true; do
      echo
      read -r -p "1) Tedd a deszkát a helyére (alátéttel vagy laposan), és engedd el. Alátét magassága mm-ben (0 = lapos, üres = befejezés): " h
      [[ -z "$h" ]] && break
      fok=$(python3 -c "import math; print(f'{math.degrees(math.asin(float(\"$h\".replace(\",\", \".\"))/$L)):.1f}')") || continue
      var "2) Ne érj semmihez, 10 s felvétel (${fok} fok)."
      $M rogzit --ido 10 --ki _statikus_tmp.csv || continue
      python3 - "$fok" <<'PY'
import csv, os, shutil, statistics as st, sys
fok = float(sys.argv[1]); tmp = '_statikus_tmp.csv'; ev = '_statikus_tmp_esemenyek.csv'
rows = list(csv.DictReader(open(tmp)))
t = [float(r['t']) for r in rows]; y = [float(r['tilt']) for r in rows]
mid = [v for v, tt in zip(y, t) if 1 <= tt <= t[-1] - 1] or y
m, sd = st.mean(mid), st.pstdev(mid)
def athelyez(cel):
    shutil.move(tmp, cel)
    if os.path.exists(ev):
        shutil.move(ev, cel[:-4] + '_esemenyek.csv')
if sd > 0.3:
    n = len([f for f in os.listdir('selejt') if not f.endswith('_esemenyek.csv')]) + 1
    athelyez(f'selejt/statikus_mozgott_{n}.csv')
    print(f'*** A panel mozgott a felvétel alatt (szórás {sd:.2f}°), ez NEM számít. Ismételd meg. ***')
    sys.exit(0)
elojel = '-' if (m < 0 and fok >= 1) else '+'
n = 1
while os.path.exists(f'statikus_{elojel}{fok:.1f}_{n}.csv'):
    n += 1
nev = f'statikus_{elojel}{fok:.1f}_{n}.csv'
athelyez(nev)
print(f'Mentve: {nev}  (mért {m:.2f}°, referencia {elojel}{fok:.1f}°, eltérés {abs(m) - fok:+.2f}°, zaj {sd:.3f}°)')
if fok >= 1 and abs(abs(m) - fok) > 3:
    print('*** FIGYELEM: a mért szög messze van a megadottól. Jó volt a magasság / a deszkahossz? ***')
PY
    done
    ls statikus_*.csv >/dev/null 2>&1 && $M statikus 'statikus_*.csv' ;;
  lepcso)
    echo "Lapos 2 s → gyorsan fel kb. 15°-ra (ütközőig) → 2 s → vissza. 8–10-szer, 60 s alatt."
    var "Deszka laposan."
    $M rogzit --ido 60 --ki lepcso.csv --parancs V0
    $M lepcso lepcso.csv ;;
  utes)
    echo "Deszka kb. 5–6°-on, mozdulatlanul. Tollal koppints a deszkára a panel mellett, 2 s-onként, 10-szer."
    var "Deszka a helyén."
    $M rogzit --ido 30 --ki utes.csv --parancs V0
    $M utes utes.csv ;;
  motor)
    var "Panel laposan, ne érj hozzá. 1. rész: motor nélkül, 60 s."
    $M rogzit --ido 60 --ki motor_ki.csv
    var "2. rész: a motor 60 s-ig folyamatosan rezeg."
    $M rogzit --ido 60 --ki motor_be.csv --parancs M1
    $M zaj motor_ki.csv motor_be.csv ;;
  kuszob)
    echo "10× egy pillanatra 11–12°-ra és azonnal vissza, aztán 10× 11–12°-ra és ott tartva kb. 1 s-ig."
    var "Panel laposan, rezgés bekapcsolva."
    $M rogzit --ido 60 --ki kuszob.csv
    kuszob_ki ;;
  kuszob_rovid)
    echo "Csak RÖVID túllépések: 10-15× pöccintsd fel a deszkát a tárgyra, és AZONNAL ejtsd vissza (minél rövidebb, annál jobb)."
    echo "Ugyanazt a véget emeld, mint az előző küszöbmérésnél. Két pöccintés között 1-2 s laposan."
    var "Deszka laposan."
    $M rogzit --ido 30 --ki kuszob_rovid.csv
    kuszob_ki ;;
  adatut)
    echo "A telefonon: alkalmazás megnyitva, csatlakozva a szenzorhoz, mérés elindítva."
    var "1. rész: 10 perc, a telefon képernyője BE, az app előtérben."
    $M rogzit --ido 600 --ki adatut_eloter.csv
    var "2. rész: 10 perc, a telefon LEZÁRVA (zsebben vagy 2–3 m-re)."
    $M rogzit --ido 600 --ki adatut_hatter.csv
    $M adatut adatut_eloter.csv adatut_hatter.csv ;;
  adatut_hatter)
    echo "A telefonon: app megnyitva, csatlakozva a szenzorhoz, mérés elindítva."
    var "10 perc, a telefon LEZÁRVA (képernyő kikapcsolva, 2-3 m-re)."
    $M rogzit --ido 600 --ki adatut_hatter.csv
    $M adatut adatut_eloter.csv adatut_hatter.csv ;;
  pcb)
    tag="${2:-elotte}"
    echo "NYÁK-diagnosztika ($tag). A PRÓBAPANELT HÚZD KI a gépből, csak a NYÁK legyen bedugva."
    var "1/4: Dugd be a NYÁK-ot USB-n (ha van akku, legyen rajta és kapcsold be). 2 percig figyelem az USB-portot, ne nyúlj hozzá."
    $M usbfigyel --ido 120 --ki "usb_$tag.csv"
    var "2/4: Feltöltöm a NYÁK-tesztprogramot. Ha nem sikerül: tartsd nyomva a BOOT gombot, nyomd meg a RESET-et, engedd el a BOOT-ot, és futtasd újra ezt a lépést."
    (cd "$S_DIR/.." && npm run pcb:flash) || echo "*** A feltöltés nem sikerült – ez is eredmény, írd fel. A 3. lépés így is lefut. ***"
    var "3/4: 3 percig olvasom a NYÁK életjeleit (újraindulások száma és oka, BMI270). Ne nyúlj hozzá."
    $M pcb --ido 180 --ki "pcb_$tag.csv"
    echo "4/4: Multiméter (V⎓, 20 V). Fekete csúcs: GND. Üres Enter: kihagyás."
    read -r -p "  3V3 feszültség (V): " v33
    read -r -p "  EN láb feszültsége (V): " ven
    read -r -p "  EN láb, ha közben ingadozik: legkisebb látott érték (V): " venmin
    read -r -p "  Megjegyzés (pl. akkuról/USB-ről, mit láttál): " megj
    printf 'allapot,v3v3,en,en_min,megjegyzes\n%s,%s,%s,%s,"%s"\n' "$tag" "$v33" "$ven" "$venmin" "$megj" > "pcb_${tag}_feszultseg.csv"
    echo "Mentve: usb_$tag.csv, pcb_$tag.csv, pcb_${tag}_feszultseg.csv" ;;
  felhelyezes)
    mkdir -p felhelyezes
    read -r -p "Közepes alátét magassága mm-ben (ugyanaz marad mind az 5 felvételnél): " h
    fok=$(python3 -c "import math; print(f'{math.degrees(math.asin(float(\"$h\".replace(\",\", \".\"))/$L)):.1f}')") || exit 1
    for n in 1 2 3 4 5; do
      echo
      var "$n/5: Vedd LE a panelt a deszkáról, tedd vissza ugyanoda (ragaszd), a deszka végét tedd az alátétre, engedd el. Utána 10 s-ig ne érj semmihez."
      $M rogzit --ido 10 --ki felhelyezes/_tmp.csv || exit 1
      python3 - "$fok" "$n" <<'PY2'
import csv, os, statistics as st, sys
fok, n = float(sys.argv[1]), sys.argv[2]
d = 'felhelyezes/'
y = [float(r['tilt']) for r in csv.DictReader(open(d + '_tmp.csv'))]
m = st.mean(y)
e = '-' if m < 0 else '+'
nev = f'{d}statikus_{e}{fok:.1f}_{n}.csv'
os.replace(d + '_tmp.csv', nev)
if os.path.exists(d + '_tmp_esemenyek.csv'):
    os.replace(d + '_tmp_esemenyek.csv', nev[:-4] + '_esemenyek.csv')
print(f'Mentve: {nev}  (mért {m:.2f}°, szórás {st.pstdev(y):.3f}°)')
PY2
    done
    (cd felhelyezes && $M statikus --mappa ../eredmenyek/felhelyezes 'statikus_*.csv') ;;
  kiertekel)
    ls statikus_*.csv >/dev/null 2>&1 && $M statikus 'statikus_*.csv'
    [[ -e lepcso.csv ]] && $M lepcso lepcso.csv
    [[ -e utes.csv ]] && $M utes utes.csv
    [[ -e motor_ki.csv && -e motor_be.csv ]] && $M zaj motor_ki.csv motor_be.csv
    kuszob_ki
    ls felhelyezes/statikus_*.csv >/dev/null 2>&1 && (cd felhelyezes && $M statikus --mappa ../eredmenyek/felhelyezes 'statikus_*.csv')
    a=(); for x in adatut_eloter.csv adatut_hatter.csv; do [[ -e $x ]] && a+=("$x"); done; ((${#a[@]})) && $M adatut "${a[@]}"
    echo "Az Overleafbe feltöltendő mappa: $HOME/Documents/meresek/eredmenyek" ;;
  *)
    echo "Használat: bash ~/Documents/meresek/merj.sh <lépés>"
    echo "Sorrend: nez → kalibral → statikus → lepcso → utes → motor → kuszob → kuszob_rovid → felhelyezes → adatut → adatut_hatter → kiertekel → pcb elotte [→ javítás → pcb utana]" ;;
esac
