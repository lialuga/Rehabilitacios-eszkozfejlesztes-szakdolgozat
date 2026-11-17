#!/usr/bin/env python3
# Source: serial port setup follows pySerial serialposix (BSD-3-Clause), https://github.com/pyserial/pyserial
import argparse
import csv
import glob
import math
import os
import re
import select
import statistics as st
import sys
import termios
import time
import tty
from pathlib import Path

LEIRAS = """Mérési segédprogram az Ashi próbapaneles prototípusához (firmware 2.1).

Felvétel (a szenzor USB-n a géphez csatlakozik, az Arduino soros monitor zárva):
  meres.py nez                                  élő kijelzés a beállításhoz
  meres.py kalibral                             nullpont az aktuális helyzetben
  meres.py rogzit --ido 10 --ki statikus_+10_1.csv
  meres.py rogzit --ido 60 --ki motor_be.csv --parancs M1
  meres.py szog --h 52 --l 300                  referenciaszög deszkából és vonalzóból

Kiértékelés (az eredmények az --mappa könyvtárba kerülnek, alapból: eredmenyek/):
  meres.py statikus statikus_*.csv
  meres.py zaj motor_ki.csv motor_be.csv
  meres.py lepcso lepcso.csv
  meres.py utes utes.csv
  meres.py kuszob kuszob.csv
  meres.py adatut adatut_eloter.csv adatut_hatter.csv

NYÁK:
  meres.py usbfigyel --ido 120 --ki usb_elotte.csv
  meres.py pcb --ido 300 --ki pcb_utana.csv
"""

ADAT_OSZLOPOK = ['ms', 'tilt', 'regi', 'gyorsulas', 'accmag', 'kapu', 'jelzes', 'motor',
                 'kapcsolat', 'csomag']


class PortElveszett(Exception):
    pass


class Port:
    def __init__(self, path):
        self.path = path
        self.fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        tty.setraw(self.fd)
        attrs = termios.tcgetattr(self.fd)
        attrs[2] |= termios.CLOCAL | termios.CREAD
        attrs[4] = attrs[5] = termios.B115200
        termios.tcsetattr(self.fd, termios.TCSANOW, attrs)
        termios.tcflush(self.fd, termios.TCIFLUSH)
        self.buf = b''

    def kuld(self, parancs):
        try:
            os.write(self.fd, (parancs + '\n').encode())
        except OSError as e:
            raise PortElveszett(str(e))

    def sorok(self, varakozas=0.2):
        try:
            olvashato, _, _ = select.select([self.fd], [], [], varakozas)
            if olvashato:
                darab = os.read(self.fd, 65536)
                if not darab:
                    raise PortElveszett('a port bezárult')
                self.buf += darab
        except BlockingIOError:
            pass
        except OSError as e:
            raise PortElveszett(str(e))
        *kesz, self.buf = self.buf.split(b'\n')
        return [k.decode(errors='ignore').strip() for k in kesz]

    def zar(self):
        try:
            os.close(self.fd)
        except OSError:
            pass


def port_keres(port):
    if port:
        return port
    portok = sorted(glob.glob('/dev/cu.usbmodem*')) + sorted(glob.glob('/dev/ttyACM*'))
    if not portok:
        sys.exit('Nem találok ESP32-t (/dev/cu.usbmodem*). Dugd be USB-n, és zárd be az Arduino soros monitort.')
    if len(portok) > 1:
        sys.exit(f'Több soros port is van: {portok}. Add meg: --port ...')
    return portok[0]


def adatsor(sor):
    r = sor.split(',')
    if len(r) != 11 or r[0] != 'D':
        return None
    try:
        return [int(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5]), int(r[6]),
                int(r[7]), int(r[8]), int(r[9]), int(r[10])]
    except ValueError:
        return None


def esemenysor(sor):
    r = sor.split(',')
    if len(r) < 3 or r[0] != 'E':
        return None
    try:
        return [int(r[1]), r[2], ';'.join(r[3:])]
    except ValueError:
        return None


def esemeny_fajl(adatfajl):
    p = Path(adatfajl)
    return p.with_name(p.stem + '_esemenyek.csv')


def rogzit(a):
    ki = Path(a.ki or time.strftime('meres_%Y%m%d_%H%M%S.csv'))
    port = Port(port_keres(a.port))
    sorok, esemenyek = [], []
    try:
        time.sleep(0.2)
        port.sorok(0.1)
        port.kuld('L1')
        for p in a.parancs:
            port.kuld(p)
        if a.kalibral:
            port.kuld('C')
        indulas = time.time() + a.elokeszites
        vege = indulas + a.ido
        utolso_kiiras = 0
        utolso_adat = time.time()
        while time.time() < vege:
            if time.time() - utolso_adat > 1.0:
                utolso_adat = time.time()
                print('\n  nem jön adat, újraindítom az adatküldést', flush=True)
                port.kuld('L1')
                for p in a.parancs:
                    port.kuld(p)
            for sor in port.sorok(0.1):
                if sor.startswith('E,'):
                    e = esemenysor(sor)
                    if e:
                        esemenyek.append(e)
                        if e[1] == 'imu':
                            print(f'\n  *** a szenzor {"kiesett" if e[2].startswith("lost") else "újra ad adatot"} '
                                  f'(nézd meg a vezetékeit) ***')
                        elif e[1] == 'filter':
                            print('\n  *** a szűrő elszállt, újraindult (ütés vagy hirtelen mozdulat volt?) ***')
                    continue
                d = adatsor(sor)
                if d is None:
                    continue
                utolso_adat = time.time()
                if time.time() < indulas:
                    continue
                sorok.append(d)
                if time.time() - utolso_kiiras > 0.5:
                    utolso_kiiras = time.time()
                    hatra = vege - time.time()
                    print(f'\r  dőlés {d[1]:7.2f}°  régi lánc {d[2]:7.2f}°  |a| {d[4]:5.2f} g  '
                          f'jelzés {d[6]}  motor {d[7]}  még {hatra:4.0f} s ', end='', flush=True)
    except KeyboardInterrupt:
        print('\n  megszakítva, az eddigi adatokat mentem')
    except PortElveszett as e:
        print(f'\n  a soros port megszakadt ({e}), az eddigi adatokat mentem')
    finally:
        try:
            if 'M1' in a.parancs:
                port.kuld('M0')
            if 'V0' in a.parancs:
                port.kuld('V1')
            port.kuld('L0')
        except PortElveszett:
            pass
        port.zar()
    print()
    if not sorok:
        sys.exit('Nem érkezett adat. Fut a 2.1-es firmware? (npm run esp32:flash)')
    ms0 = sorok[0][0]
    with open(ki, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['t'] + ADAT_OSZLOPOK)
        for d in sorok:
            w.writerow([f'{(d[0] - ms0) / 1000:.3f}'] + d)
    if esemenyek:
        with open(esemeny_fajl(ki), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['t', 'esemeny', 'adat'])
            for e in esemenyek:
                w.writerow([f'{(e[0] - ms0) / 1000:.3f}', e[1], e[2]])
    resek = [b[0] - a_[0] for a_, b in zip(sorok, sorok[1:])]
    hossz = (sorok[-1][0] - ms0) / 1000
    kimaradt = sum(1 for r in resek if r > 15)
    print(f'{ki}: {len(sorok)} minta, {hossz:.1f} s, {len(sorok) / max(hossz, 1e-9):.1f} Hz, '
          f'15 ms-nál hosszabb rés: {kimaradt} (leghosszabb {max(resek, default=0)} ms)')
    if esemenyek:
        print(f'{esemeny_fajl(ki)}: {len(esemenyek)} esemény')
    kiesett = sum(1 for e in esemenyek if e[1] == 'imu' and e[2].startswith('lost'))
    if kiesett:
        print(f'*** A szenzor {kiesett}-szer kiesett a felvétel alatt: ez a felvétel nem jó, ismételd meg. ***')


def nez(a):
    port = Port(port_keres(a.port))
    print('Élő értékek (Ctrl+C: kilépés). A dőlésnek a deszka döntésével kell változnia.')
    try:
        port.kuld('L1')
        utolso = 0
        while True:
            for sor in port.sorok(0.1):
                d = adatsor(sor)
                if d and time.time() - utolso > 0.25:
                    utolso = time.time()
                    print(f'\r  dőlés {d[1]:7.2f}°  régi lánc {d[2]:7.2f}°  gyorsulásból {d[3]:7.2f}°  '
                          f'|a| {d[4]:5.2f} g  jelzés {d[6]}  BLE {d[8]} ', end='', flush=True)
    except KeyboardInterrupt:
        print()
    finally:
        try:
            port.kuld('L0')
        except PortElveszett:
            pass
        port.zar()


def kalibral(a):
    port = Port(port_keres(a.port))
    try:
        port.kuld('C')
        vege = time.time() + 2
        while time.time() < vege:
            for sor in port.sorok(0.1):
                if 'calibrated' in sor:
                    print(sor)
                    return
        print('Elküldve (visszajelzést nem láttam; a kalibráció a következő mintánál megtörténik).')
    finally:
        port.zar()


def szog(a):
    if not 0 < a.h < a.l:
        sys.exit('A magasság legyen 0 és a deszkahossz között.')
    fok = math.degrees(math.asin(a.h / a.l))
    hiba = math.degrees(a.pontossag / math.sqrt(a.l ** 2 - a.h ** 2))
    print(f'{fok:.2f}° (±{hiba:.2f}° a ±{a.pontossag} mm-es magasságmérésből)')
    print(f'fájlnév például: statikus_+{fok:.1f}_1.csv  (kifelé döntve: statikus_-{fok:.1f}_1.csv)')


def betolt(fn):
    with open(fn, newline='') as f:
        sorok = [{k: float(v) for k, v in s.items()} for s in csv.DictReader(f)]
    if not sorok or 'tilt' not in sorok[0]:
        sys.exit(f'{fn}: nem a rogzit paranccsal készült fájl')
    return sorok


def oszlop(sorok, nev):
    return [s[nev] for s in sorok]


def esemenyek_betolt(fn):
    p = esemeny_fajl(fn)
    if not p.exists():
        return []
    with open(p, newline='') as f:
        return list(csv.DictReader(f))


def konfig(fn):
    for e in esemenyek_betolt(fn):
        if e['esemeny'] == 'config':
            r = e['adat'].split(';')
            try:
                return {'be': float(r[0]), 'ki': float(r[1]), 'rezges': int(r[2]),
                        'elesites': float(r[3]), 'hiszterezis': float(r[4])}
            except (IndexError, ValueError):
                return None
    return None


def fajlok(mintak):
    lista = sorted({f for m in mintak for f in (glob.glob(m) or [m]) if not f.endswith('_esemenyek.csv')})
    hianyzik = [f for f in lista if not Path(f).exists()]
    if hianyzik:
        sys.exit(f'Nincs ilyen fájl: {hianyzik}')
    return lista


def mappa(a):
    d = Path(a.mappa)
    d.mkdir(parents=True, exist_ok=True)
    return d


def csv_ir(utvonal, fejlec, sorok):
    with open(utvonal, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(fejlec)
        for s in sorok:
            w.writerow([f'{x:.4f}' if isinstance(x, float) else x for x in s])


def tx(x, jegy=2):
    if isinstance(x, str):
        return x
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return '--'
    s = f'{x:.{jegy}f}'.replace('.', '{,}')
    return f'${s}$'


def tex_tabla(utvonal, felirat, cimke, fejlec, sorok, igazitas=None, lablec=None):
    igazitas = igazitas or 'l' + 'r' * (len(fejlec) - 1)
    t = ['\\begin{table}[htbp]', '  \\centering', '  \\small', f'  \\begin{{tabular}}{{@{{}}{igazitas}@{{}}}}',
         '    \\toprule', '    ' + ' & '.join(fejlec) + ' \\\\', '    \\midrule']
    for s in sorok:
        t.append('    ' + ' & '.join(s) + ' \\\\')
    if lablec:
        t += ['    \\midrule', f'    \\multicolumn{{{len(fejlec)}}}{{@{{}}l@{{}}}}{{{lablec}}} \\\\']
    t += ['    \\bottomrule', '  \\end{tabular}', f'  \\caption{{{felirat}}}', f'  \\label{{{cimke}}}',
          '\\end{table}', '']
    Path(utvonal).write_text('\n'.join(t), encoding='utf-8')


def tex_abra(utvonal, felirat, cimke, xcimke, ycimke, gorbek, extra=''):
    t = ['\\begin{figure}[htbp]', '  \\centering', '  \\begin{tikzpicture}',
         f'    \\begin{{axis}}[width=0.9\\textwidth, height=5.5cm, xlabel={{{xcimke}}}, ylabel={{{ycimke}}},',
         '      grid=major, grid style={gray!25}, legend pos=north east, legend cell align=left,',
         '      every axis plot/.append style={thick}, /pgf/number format/use comma]']
    for g in gorbek:
        t.append(f'      {g}')
    if extra:
        t.append(f'      {extra}')
    t += ['    \\end{axis}', '  \\end{tikzpicture}', f'  \\caption{{{felirat}}}', f'  \\label{{{cimke}}}',
          '\\end{figure}', '']
    Path(utvonal).write_text('\n'.join(t), encoding='utf-8')


def ritkit(sorok, max_pont=1200):
    lepes = max(1, math.ceil(len(sorok) / max_pont))
    return sorok[::lepes]


def kozepso(sorok, levag):
    t = oszlop(sorok, 't')
    if t[-1] - t[0] <= 2 * levag + 1:
        return sorok
    return [s for s in sorok if t[0] + levag <= s['t'] <= t[-1] - levag]


def szoras(x):
    return st.stdev(x) if len(x) > 1 else float('nan')


def statikus(a):
    d = mappa(a)
    minta = re.compile(r'statikus_([+-]?\d+(?:[.,]\d+)?)_(\d+)', re.I)
    beallitasok = []
    for fn in fajlok(a.fajlok):
        m = minta.search(Path(fn).stem)
        if not m:
            print('kihagyva, nincs referenciaszög a névben:', fn)
            continue
        ref = float(m[1].replace(',', '.'))
        s = kozepso(betolt(fn), a.levag)
        y = oszlop(s, 'tilt')
        beallitasok.append([Path(fn).name, ref, int(m[2]), len(y), st.mean(y), st.pstdev(y),
                            st.mean(oszlop(s, 'regi')), st.mean(y) - ref])
    if not beallitasok:
        sys.exit('Nincs kiértékelhető statikus_<szög>_<ismétlés>.csv fájl.')
    csv_ir(d / 'statikus_beallitasok.csv',
           ['fajl', 'ref', 'ismetles', 'n', 'atlag', 'zaj_szoras', 'regi_atlag', 'hiba'], beallitasok)
    szogek = []
    for ref in sorted({b[1] for b in beallitasok}):
        cs = [b for b in beallitasok if b[1] == ref]
        atl = [b[4] for b in cs]
        szogek.append([ref, len(cs), st.mean(atl), st.mean(atl) - ref, szoras(atl),
                       st.mean(b[5] for b in cs)])
    csv_ir(d / 'statikus_szogek.csv', ['ref', 'n', 'atlag', 'hiba', 'ismetelhetoseg', 'zaj'],
           [s_[:4] + [0.0 if math.isnan(s_[4]) else s_[4]] + s_[5:] for s_ in szogek])
    hibak = [b[7] for b in beallitasok]
    refek = [b[1] for b in beallitasok]
    mertek = [b[4] for b in beallitasok]
    meredekseg, tengely = 1.0, 0.0
    if len(set(refek)) > 1:
        rm, mm = st.mean(refek), st.mean(mertek)
        meredekseg = sum((r - rm) * (m_ - mm) for r, m_ in zip(refek, mertek)) / sum((r - rm) ** 2 for r in refek)
        tengely = mm - meredekseg * rm
    ism = [s[4] for s in szogek if not math.isnan(s[4])]
    ossz = {
        'beallitasok': len(hibak),
        'atlagos_hiba': st.mean(hibak),
        'atlagos_abszolut_hiba': st.mean(abs(h) for h in hibak),
        'rmse': math.sqrt(st.mean(h * h for h in hibak)),
        'max_elteres': max(abs(h) for h in hibak),
        'ismetelhetoseg_atlag': st.mean(ism) if ism else float('nan'),
        'zaj_atlag': st.mean(b[5] for b in beallitasok),
        'meredekseg': meredekseg,
        'tengelymetszet': tengely,
    }
    csv_ir(d / 'statikus_osszesito.csv', list(ossz), [list(ossz.values())])
    tex_tabla(d / 'statikus_tabla.tex',
              'Statikus szöghiba ismert dőlésszögeknél (ismétlés: a próbapanel újrahelyezése; '
              'ismételhetőség: az ismétlések átlagainak szórása; zaj: a felvételen belüli szórás)',
              'tab:statikus',
              ['Referencia', '$n$', 'Mért átlag', 'Hiba', 'Ismételhetőség', 'Zaj'],
              [[tx(s[0], 1) + '$^\\circ$', str(s[1]), tx(s[2]), tx(s[3]), tx(s[4]), tx(s[5])] for s in szogek],
              lablec='Összesen ' + str(ossz['beallitasok']) + ' beállítás: átlagos hiba '
              + tx(ossz['atlagos_hiba']) + '$^\\circ$, RMSE ' + tx(ossz['rmse']) + '$^\\circ$, max. eltérés '
              + tx(ossz['max_elteres']) + '$^\\circ$')
    tex_abra(d / 'statikus_abra.tex', 'A statikus szöghiba a referenciaszög függvényében '
             '(hibasáv: az ismétlések szórása)', 'fig:statikus', 'referenciaszög [$^\\circ$]', 'hiba [$^\\circ$]',
             ['\\addplot+[only marks, error bars/.cd, y dir=both, y explicit] table[x=ref, y=hiba, '
              'y error=ismetelhetoseg, col sep=comma] {meresek/statikus_szogek.csv};'],
             '\\addplot[gray, dashed, domain=-25:25] {0};')
    print(f"{ossz['beallitasok']} beállítás: átlagos hiba {ossz['atlagos_hiba']:.2f}°, "
          f"átlagos abszolút hiba {ossz['atlagos_abszolut_hiba']:.2f}°, RMSE {ossz['rmse']:.2f}°, "
          f"max. eltérés {ossz['max_elteres']:.2f}°, ismételhetőség (átlagos szórás) "
          f"{ossz['ismetelhetoseg_atlag']:.2f}°, zaj {ossz['zaj_atlag']:.3f}°, "
          f"mért = {meredekseg:.3f}·ref {tengely:+.2f}°")
    print(f'Kimenet: {d}/statikus_*.csv, statikus_tabla.tex, statikus_abra.tex')


def felfuto_elek(x, ertek=None):
    n = 0
    elozo = 0
    for v in x:
        aktiv = (v == ertek) if ertek is not None else v != 0
        if aktiv and not elozo:
            n += 1
        elozo = aktiv
    return n


def zaj(a):
    d = mappa(a)
    eredm, gorbek = [], []
    for fn in fajlok(a.fajlok):
        s = kozepso(betolt(fn), a.levag)
        y = oszlop(s, 'tilt')
        r = oszlop(s, 'regi')
        g = oszlop(s, 'gyorsulas')
        acc = oszlop(s, 'accmag')
        nev = Path(fn).stem
        atl = st.mean(y)
        eredm.append([nev, len(y), st.mean(oszlop(s, 'motor')) * 100, atl, st.pstdev(y), max(y) - min(y),
                      st.pstdev(r), st.pstdev(g), st.pstdev(acc), st.mean(oszlop(s, 'kapu')) * 100,
                      felfuto_elek(oszlop(s, 'jelzes'))])
        idosor = ritkit([[x['t'], x['tilt'] - atl] for x in s])
        csv_ir(d / f'zaj_{nev}.csv', ['t', 'elteres'], idosor)
        gorbek.append(f'\\addplot+[no marks] table[x=t, y=elteres, col sep=comma] {{meresek/zaj_{nev}.csv}}; '
                      f'\\addlegendentry{{{nev.replace("_", " ")}}}')
    fejlec = ['fajl', 'n', 'motor_be_szazalek', 'atlag', 'szoras', 'csucs_csucs', 'regi_szoras',
              'gyorsulas_szoras', 'accmag_szoras', 'kapuzott_szazalek', 'teves_jelzes']
    csv_ir(d / 'zaj.csv', fejlec, eredm)
    tex_tabla(d / 'zaj_tabla.tex', 'A dőlésjel zaja nyugalomban, kikapcsolt és bekapcsolt rezgőmotorral',
              'tab:zaj', ['Felvétel', 'Motor', 'Szórás', 'Csúcstól csúcsig', '$\\lVert\\mathbf{a}\\rVert$ szórása',
                          'Kapuzott minta', 'Téves jelzés'],
              [[e[0].replace('_', '\\_'), tx(e[2], 0) + '\\,\\%', tx(e[4], 3) + '$^\\circ$', tx(e[5]) + '$^\\circ$',
                tx(e[8], 3) + '\\,$g$', tx(e[9], 1) + '\\,\\%', str(e[10])] for e in eredm])
    tex_abra(d / 'zaj_abra.tex', 'A dőlésjel eltérése az átlagától nyugalomban, motorral és motor nélkül',
             'fig:zaj', 'idő [s]', 'eltérés [$^\\circ$]', gorbek)
    for e in eredm:
        print(f'{e[0]}: motor {e[2]:.0f}% | dőlés szórás {e[4]:.3f}°, csúcs-csúcs {e[5]:.2f}° | régi lánc szórás '
              f'{e[6]:.3f}° | gyorsulásból {e[7]:.3f}° | |a| szórás {e[8]:.4f} g | kapuzott {e[9]:.1f}% | '
              f'téves jelzés {e[10]}')
    print(f'Kimenet: {d}/zaj.csv, zaj_tabla.tex, zaj_abra.tex, zaj_<fájl>.csv')


def gordulo_szoras(y, ablak):
    n = len(y)
    s1 = [0.0]
    s2 = [0.0]
    for v in y:
        s1.append(s1[-1] + v)
        s2.append(s2[-1] + v * v)
    fel = ablak // 2
    ki = []
    for i in range(n):
        a_, b = max(0, i - fel), min(n, i + fel + 1)
        m = b - a_
        atl = (s1[b] - s1[a_]) / m
        ki.append(math.sqrt(max(0.0, (s2[b] - s2[a_]) / m - atl * atl)))
    return ki


def platok(sorok, stabil, min_hossz):
    t = oszlop(sorok, 't')
    y = oszlop(sorok, 'tilt')
    dt = st.median(b - a_ for a_, b in zip(t, t[1:]))
    sz = gordulo_szoras(y, max(3, round(0.3 / dt)))
    futasok = []
    kezd = None
    for i, v in enumerate(sz):
        if v < stabil and kezd is None:
            kezd = i
        if (v >= stabil or i == len(sz) - 1) and kezd is not None:
            veg = i if v >= stabil else i + 1
            if t[veg - 1] - t[kezd] >= min_hossz:
                futasok.append([kezd, veg])
            kezd = None
    osszevont = []
    for f in futasok:
        if osszevont and abs(st.median(y[f[0]:f[1]]) - st.median(y[osszevont[-1][0]:osszevont[-1][1]])) < 1.5:
            osszevont[-1][1] = f[1]
        else:
            osszevont.append(f)
    return osszevont, dt


def atlepes_ideje(t, x, a_, b, hanyad, i0, i1):
    for i in range(i0 + 1, i1):
        e = (x[i - 1] - a_) / (b - a_)
        u = (x[i] - a_) / (b - a_)
        if e < hanyad <= u:
            return t[i - 1] + (hanyad - e) / (u - e) * (t[i] - t[i - 1])
    return float('nan')


def lepcso(a):
    d = mappa(a)
    eredm = []
    legjobb = None
    for fn in fajlok(a.fajlok):
        sorok = betolt(fn)
        t = oszlop(sorok, 't')
        lanc = {'uj': oszlop(sorok, 'tilt'), 'regi': oszlop(sorok, 'regi'), 'gyors': oszlop(sorok, 'gyorsulas')}
        pl, dt = platok(sorok, a.stabil, a.min_plato)
        fel = max(1, round(0.5 / dt))
        for p, q in zip(pl, pl[1:]):
            i0 = max(p[0], p[1] - fel)
            i1 = q[1]
            ib = max(q[0], q[1] - fel)
            szint = {k: (st.median(v[i0:p[1]]), st.median(v[ib:q[1]])) for k, v in lanc.items()}
            dA, dB = szint['uj']
            if abs(dB - dA) < a.min_lepes:
                continue
            t0 = atlepes_ideje(t, lanc['uj'], dA, dB, 0.1, i0, i1)
            if math.isnan(t0):
                continue
            sor = [Path(fn).name, round(t0, 3), dA, dB, dB - dA]
            for k in ('uj', 'regi'):
                A, B = szint[k]
                x = lanc[k]
                t50 = atlepes_ideje(t, x, A, B, 0.5, i0, i1) - t0
                t90 = atlepes_ideje(t, x, A, B, 0.9, i0, i1) - t0
                utolso_kint = max((i for i in range(i0, i1) if abs(x[i] - B) > a.tures), default=i0)
                beall = t[min(utolso_kint + 1, i1 - 1)] - t0
                tul = max((x[i] - B) * (1 if B > A else -1) for i in range(i0, i1))
                sor += [t50, t90, beall, max(0.0, tul), B - szint['uj'][1]]
            eredm.append(sor)
            if legjobb is None or abs(dB - dA) > abs(legjobb[1]):
                legjobb = (sorok, dB - dA, t0, i0, i1)
    if not eredm:
        sys.exit('Nem találtam lépcsőt. Tartsd a szenzort legalább 1,5 s-ig mozdulatlanul minden helyzetben, '
                 'és a két helyzet között legyen legalább ' + f'{a.min_lepes}°.')
    fejlec = ['fajl', 't0', 'kezdo', 'veg', 'lepes',
              'uj_t50', 'uj_t90', 'uj_beallas', 'uj_tullendules', 'uj_vegso_elteres',
              'regi_t50', 'regi_t90', 'regi_beallas', 'regi_tullendules', 'regi_vegso_elteres']
    csv_ir(d / 'lepcso.csv', fejlec, eredm)
    ossz = []
    for k, nev in ((5, 'új lánc'), (10, 'régi lánc')):
        mezok = [[r[k + j] * (1000 if j < 3 else 1) for r in eredm if not math.isnan(r[k + j])] for j in range(5)]
        ossz.append([nev] + [(st.mean(m) if m else float('nan'), szoras(m)) for m in mezok])
    keses = [r[10] - r[5] for r in eredm if not (math.isnan(r[10]) or math.isnan(r[5]))]
    csv_ir(d / 'lepcso_osszesito.csv',
           ['lanc', 't50_ms', 't50_szoras', 't90_ms', 't90_szoras', 'beallas_ms', 'beallas_szoras',
            'tullendules', 'tullendules_szoras', 'vegso_elteres', 'vegso_elteres_szoras'],
           [[o[0]] + [v for par in o[1:] for v in par] for o in ossz])
    pm = lambda par, j=0: tx(par[0], j) + ' $\\pm$ ' + tx(par[1], j)
    tex_tabla(d / 'lepcso_tabla.tex',
              f'Lépésválasz hirtelen döntésre ({len(eredm)} lépcső, átlag $\\pm$ szórás; az idők a mozgás '
              f'kezdetétől, a beállás $\\pm{tx(a.tures, 1)[1:-1]}^\\circ$-on belülre értendő)', 'tab:lepcso',
              ['Szűrőlánc', '$t_{50}$ [ms]', '$t_{90}$ [ms]', 'Beállás [ms]', 'Túllendülés [$^\\circ$]'],
              [[o[0], pm(o[1]), pm(o[2]), pm(o[3]), pm(o[4], 2)] for o in ossz])
    sorok, lep, t0, i0, i1 = legjobb
    pelda = ritkit([[s['t'] - t0, s['tilt'], s['regi'], s['gyorsulas']] for s in sorok[i0:i1]
                    if s['t'] - t0 <= a.ablak])
    csv_ir(d / 'lepcso_pelda.csv', ['t', 'uj', 'regi', 'gyorsulas'], pelda)
    tex_abra(d / 'lepcso_abra.tex', 'Hirtelen döntés: a jelenlegi és a kiinduló szűrőlánc kimenete, '
             'valamint a csak gyorsulásmérőből számolt szög', 'fig:lepcso', 'idő a mozgás kezdetétől [s]',
             'dőlés [$^\\circ$]',
             ['\\addplot+[no marks] table[x=t, y=uj, col sep=comma] {meresek/lepcso_pelda.csv}; '
              '\\addlegendentry{jelenlegi lánc}',
              '\\addplot+[no marks, dashed] table[x=t, y=regi, col sep=comma] {meresek/lepcso_pelda.csv}; '
              '\\addlegendentry{kiinduló lánc}',
              '\\addplot+[no marks, gray, thin] table[x=t, y=gyorsulas, col sep=comma] {meresek/lepcso_pelda.csv}; '
              '\\addlegendentry{csak gyorsulásmérő}'])
    for o in ossz:
        print(f'{o[0]}: t50 {o[1][0]:.0f}±{o[1][1]:.0f} ms, t90 {o[2][0]:.0f}±{o[2][1]:.0f} ms, beállás '
              f'{o[3][0]:.0f}±{o[3][1]:.0f} ms, túllendülés {o[4][0]:.2f}±{o[4][1]:.2f}°')
    if keses:
        print(f'A régi lánc késése az újhoz képest (t50): {st.mean(keses) * 1000:.0f} ms átlagosan, '
              f'{len(eredm)} lépcső')
    print(f'Kimenet: {d}/lepcso.csv, lepcso_osszesito.csv, lepcso_tabla.tex, lepcso_abra.tex, lepcso_pelda.csv')


def utes(a):
    d = mappa(a)
    eredm = []
    legjobb = None
    for fn in fajlok(a.fajlok):
        sorok = betolt(fn)
        t = oszlop(sorok, 't')
        alap = {k: st.median(oszlop(sorok, k)) for k in ('tilt', 'regi', 'gyorsulas')}
        kint = [i for i, s in enumerate(sorok) if s['kapu'] or not (0.85 < s['accmag'] < 1.15)]
        csoportok = []
        for i in kint:
            if csoportok and t[i] - t[csoportok[-1][-1]] < a.szunet:
                csoportok[-1].append(i)
            else:
                csoportok.append([i])
        for cs in csoportok:
            te = t[cs[0]]
            ablak = [s for s in sorok if te - 0.1 <= s['t'] <= te + a.ablak]
            if not ablak:
                continue
            elt = {k: max(abs(s[k] - alap[k]) for s in ablak) for k in alap}
            eredm.append([Path(fn).name, te, max(s['accmag'] for s in ablak), len(cs) * 10,
                          elt['tilt'], elt['regi'], elt['gyorsulas'], felfuto_elek([s['jelzes'] for s in ablak])])
            if legjobb is None or elt['gyorsulas'] > legjobb[0]:
                legjobb = (elt['gyorsulas'], te, alap, ablak)
    if not eredm:
        sys.exit('Nem találtam ütést (|a| a 0,85–1,15 g sávon kívül). Koppints erősebben a próbapanel mellé.')
    csv_ir(d / 'utes.csv', ['fajl', 't', 'accmag_csucs', 'kapuzott_ms', 'uj_max_elteres', 'regi_max_elteres',
                            'gyorsulas_max_elteres', 'jelzes'], eredm)
    ossz = [[nev] + [st.mean(r[k] for r in eredm), max(r[k] for r in eredm)]
            for nev, k in (('jelenlegi lánc', 4), ('kiinduló lánc', 5), ('csak gyorsulásmérő', 6))]
    csv_ir(d / 'utes_osszesito.csv', ['lanc', 'atlagos_max_elteres', 'legnagyobb_elteres'], ossz)
    tex_tabla(d / 'utes_tabla.tex',
              f'A dőlésszög legnagyobb eltérése a nyugalmi értéktől ütések alatt ({len(eredm)} ütés, '
              f'átlagos csúcsgyorsulás {tx(st.mean(r[2] for r in eredm))}\\,$g$)', 'tab:utes',
              ['Számítás', 'Átlagos legnagyobb eltérés', 'Legnagyobb eltérés'],
              [[o[0], tx(o[1]) + '$^\\circ$', tx(o[2]) + '$^\\circ$'] for o in ossz])
    _, te, alap, ablak = legjobb
    csv_ir(d / 'utes_pelda.csv', ['t', 'uj', 'regi', 'gyorsulas', 'accmag'],
           [[s['t'] - te, s['tilt'] - alap['tilt'], s['regi'] - alap['regi'], s['gyorsulas'] - alap['gyorsulas'],
             s['accmag']] for s in ablak])
    tex_abra(d / 'utes_abra.tex', 'Egy ütés hatása a dőlésszögre: a nyugalmi értéktől való eltérés',
             'fig:utes', 'idő az ütéstől [s]', 'eltérés [$^\\circ$]',
             ['\\addplot+[no marks] table[x=t, y=uj, col sep=comma] {meresek/utes_pelda.csv}; '
              '\\addlegendentry{jelenlegi lánc}',
              '\\addplot+[no marks, dashed] table[x=t, y=regi, col sep=comma] {meresek/utes_pelda.csv}; '
              '\\addlegendentry{kiinduló lánc}',
              '\\addplot+[no marks, gray, thin] table[x=t, y=gyorsulas, col sep=comma] {meresek/utes_pelda.csv}; '
              '\\addlegendentry{csak gyorsulásmérő}'])
    for o in ossz:
        print(f'{o[0]}: átlagos legnagyobb eltérés {o[1]:.2f}°, legnagyobb {o[2]:.2f}°')
    print(f'{len(eredm)} ütés. Kimenet: {d}/utes.csv, utes_osszesito.csv, utes_tabla.tex, utes_abra.tex, utes_pelda.csv')


def kuszob(a):
    d = mappa(a)
    eredm = []
    for fn in fajlok(a.fajlok):
        sorok = betolt(fn)
        k = konfig(fn) or {}
        befele = a.irany == 'be'
        T = a.kuszob if a.kuszob is not None else k.get('be' if befele else 'ki', 8.0 if befele else 10.0)
        h = k.get('hiszterezis', a.hiszterezis)
        elesites = k.get('elesites', a.elesites)
        kod = 1 if befele else 2
        t = oszlop(sorok, 't')
        x = [s['tilt'] if befele else -s['tilt'] for s in sorok]
        i = 1
        while i < len(x):
            if x[i] > T >= x[i - 1]:
                kezd = i
                j = i
                while j < len(x) and x[j] >= T - h:
                    j += 1
                if j >= len(x):
                    break
                tk = t[kezd - 1] + (T - x[kezd - 1]) / (x[kezd] - x[kezd - 1]) * (t[kezd] - t[kezd - 1])
                hossz = (t[j] - t[kezd]) * 1000
                jel = next((m for m in range(kezd, j) if sorok[m]['jelzes'] == kod), None)
                motor = next((m for m in range(jel, j) if sorok[m]['motor']), None) if jel is not None else None
                if hossz < elesites - a.sav:
                    osztaly = 'rövid'
                elif hossz > elesites + a.sav:
                    osztaly = 'tartós'
                else:
                    osztaly = 'határeset'
                eredm.append([Path(fn).name, round(t[kezd], 3), hossz, osztaly, 1 if jel is not None else 0,
                              (t[jel] - tk) * 1000 if jel is not None else float('nan'),
                              (t[motor] - tk) * 1000 if motor is not None else float('nan'),
                              max(x[kezd:j]) - T, T])
                i = j
            i += 1
    if not eredm:
        sys.exit('Nem volt küszöbátlépés. Ellenőrizd az irányt (--irany) és a küszöböt (--kuszob).')
    csv_ir(d / 'kuszob_epizodok.csv', ['fajl', 't', 'hossz_ms', 'osztaly', 'jelzett', 'kesleltetes_ms',
                                       'motor_kesleltetes_ms', 'max_tullepes', 'kuszob'], eredm)
    rovid = [r for r in eredm if r[3] == 'rövid']
    tartos = [r for r in eredm if r[3] == 'tartós']
    hatar = [r for r in eredm if r[3] == 'határeset']
    kes = [r[5] for r in tartos if r[4]]
    ossz = {
        'rovid': len(rovid), 'rovid_teves_jelzes': sum(r[4] for r in rovid),
        'tartos': len(tartos), 'tartos_elmulasztott': sum(1 - r[4] for r in tartos),
        'hatareset': len(hatar), 'hatareset_jelzett': sum(r[4] for r in hatar),
        'kesleltetes_atlag_ms': st.mean(kes) if kes else float('nan'),
        'kesleltetes_szoras_ms': szoras(kes),
        'kesleltetes_min_ms': min(kes, default=float('nan')),
        'kesleltetes_max_ms': max(kes, default=float('nan')),
    }
    csv_ir(d / 'kuszob_osszesito.csv', list(ossz), [list(ossz.values())])
    tex_tabla(d / 'kuszob_tabla.tex',
              f'A rezgéses jelzés feltételeinek ellenőrzése (élesítési idő {tx(float(elesites), 0)}\\,ms, '
              f'a késleltetés a küszöbátlépéstől a jelzés indulásáig értendő)', 'tab:kuszob',
              ['Küszöbtúllépés', 'Esetek', 'Jelzett', 'Várt viselkedés'],
              [[f'rövid ($<{tx(float(elesites - a.sav), 0)[1:-1]}$\\,ms)', str(ossz['rovid']),
                str(ossz['rovid_teves_jelzes']), 'nincs jelzés'],
               [f'tartós ($>{tx(float(elesites + a.sav), 0)[1:-1]}$\\,ms)', str(ossz['tartos']),
                str(ossz['tartos'] - ossz['tartos_elmulasztott']), 'jelzés'],
               ['határeset', str(ossz['hatareset']), str(ossz['hatareset_jelzett']), '--']], 'lrrl',
              lablec='Késleltetés: ' + tx(ossz['kesleltetes_atlag_ms'], 0) + ' $\\pm$ '
              + tx(ossz['kesleltetes_szoras_ms'], 0) + '\\,ms (' + tx(ossz['kesleltetes_min_ms'], 0) + '--'
              + tx(ossz['kesleltetes_max_ms'], 0) + '\\,ms)')
    print(f"rövid túllépés: {ossz['rovid']}, ebből téves jelzés {ossz['rovid_teves_jelzes']} | tartós: "
          f"{ossz['tartos']}, ebből elmulasztott {ossz['tartos_elmulasztott']} | határeset: {ossz['hatareset']}")
    if kes:
        print(f"késleltetés a küszöbátlépéstől: {ossz['kesleltetes_atlag_ms']:.0f} ± "
              f"{ossz['kesleltetes_szoras_ms']:.0f} ms ({ossz['kesleltetes_min_ms']:.0f}–"
              f"{ossz['kesleltetes_max_ms']:.0f} ms)")
    print(f'Kimenet: {d}/kuszob_epizodok.csv, kuszob_osszesito.csv, kuszob_tabla.tex')


def adatut(a):
    d = mappa(a)
    eredm = []
    for fn in fajlok(a.fajlok):
        sorok = betolt(fn)
        t = oszlop(sorok, 't')
        k = oszlop(sorok, 'kapcsolat')
        cs = oszlop(sorok, 'csomag')
        elso = next((i for i, v in enumerate(k) if v), None)
        if elso is None:
            eredm.append([Path(fn).stem, t[-1] - t[0], 0.0, 0, 0.0, 0.0, 0, float('nan'), float('nan')])
            continue
        bontas, kimaradas, leghosszabb, kezd = 0, 0.0, 0.0, None
        for i in range(elso + 1, len(k)):
            if k[i - 1] and not k[i]:
                bontas += 1
                kezd = t[i]
            if not k[i - 1] and k[i] and kezd is not None:
                kimaradas += t[i] - kezd
                leghosszabb = max(leghosszabb, t[i] - kezd)
                kezd = None
        if kezd is not None:
            kimaradas += t[-1] - kezd
            leghosszabb = max(leghosszabb, t[-1] - kezd)
        kuldott = (cs[-1] - cs[elso]) % 65536
        kapcsolt_ido = t[-1] - t[elso] - kimaradas
        vart = kapcsolt_ido * 25
        eredm.append([Path(fn).stem, t[-1] - t[0], kapcsolt_ido, bontas, kimaradas, leghosszabb, int(kuldott),
                      kuldott / kapcsolt_ido if kapcsolt_ido > 0 else float('nan'),
                      100 * kuldott / vart if vart > 0 else float('nan')])
    csv_ir(d / 'adatut.csv', ['felvetel', 'hossz_s', 'kapcsolatban_s', 'bontasok', 'kimaradas_s',
                              'leghosszabb_kimaradas_s', 'kuldott_csomag', 'csomag_per_s', 'kuldes_szazalek'], eredm)
    tex_tabla(d / 'adatut_tabla.tex', 'Teljes adatút valódi telefonnal: a kapcsolat stabilitása és a '
              'szenzor által elküldött csomagok', 'tab:adatut',
              ['Felvétel', 'Hossz [s]', 'Bontás', 'Kimaradás [s]', 'Elküldött csomag', 'Csomag/s'],
              [[e[0].replace('_', '\\_'), tx(e[1], 0), str(e[3]), tx(e[4], 1), str(e[6]), tx(e[7], 1)]
               for e in eredm])
    for e in eredm:
        print(f'{e[0]}: {e[1]:.0f} s, kapcsolatban {e[2]:.0f} s, bontás {e[3]}, kimaradás {e[4]:.1f} s '
              f'(leghosszabb {e[5]:.1f} s), elküldött csomag {e[6]} ({e[7]:.1f}/s, a 25 Hz {e[8]:.1f}%-a)')
    print(f'Kimenet: {d}/adatut.csv, adatut_tabla.tex')


def usbfigyel(a):
    ki = Path(a.ki or 'usb_figyeles.csv')
    print(f'{a.ido:.0f} s-ig figyelem az USB-portot (Ctrl+C: leállítás)...')
    kezd = time.time()
    elozo = None
    esemenyek = []
    try:
        while time.time() - kezd < a.ido:
            van = bool(glob.glob('/dev/cu.usbmodem*') or glob.glob('/dev/ttyACM*'))
            if van != elozo:
                esemenyek.append([round(time.time() - kezd, 3), 'megjelent' if van else 'eltűnt'])
                print(f'  {esemenyek[-1][0]:7.2f} s  {esemenyek[-1][1]}')
                elozo = van
            time.sleep(0.05)
    except KeyboardInterrupt:
        pass
    hossz = time.time() - kezd
    csv_ir(ki, ['t', 'esemeny'], esemenyek)
    megj = [e[0] for e in esemenyek if e[1] == 'megjelent']
    eltunt = [e[0] for e in esemenyek if e[1] == 'eltűnt']
    szakaszok = []
    for m in megj:
        vege = next((e for e in eltunt if e > m), hossz)
        szakaszok.append(vege - m)
    print(f'{ki}: {hossz:.0f} s alatt {len(megj)} megjelenés, {len([e for e in eltunt if e > 0.001])} eltűnés, '
          f'leghosszabb folyamatos kapcsolat {max(szakaszok, default=0):.1f} s')


def pcb(a):
    ki = Path(a.ki or 'pcb_teszt.csv')
    kezd = time.time()
    sorok, elveszett, port = [], 0, None
    print(f'{a.ido:.0f} s-ig olvasom a pcb_teszt program sorait (Ctrl+C: leállítás)...')
    try:
        while time.time() - kezd < a.ido:
            if port is None:
                try:
                    port = Port(port_keres(a.port) if a.port or glob.glob('/dev/cu.usbmodem*') else '')
                except (OSError, SystemExit):
                    port = None
                    time.sleep(0.2)
                    continue
            try:
                for sor in port.sorok(0.2):
                    r = sor.split(',')
                    if len(r) == 7 and r[0] == 'H':
                        sorok.append([round(time.time() - kezd, 3)] + r[1:])
                        print(f'\r  {sorok[-1][0]:6.1f} s  indítás #{r[2]} ({r[3]})  I2C eszköz: {r[4]}  '
                              f'BMI270: {r[6]}   ', end='', flush=True)
            except PortElveszett:
                elveszett += 1
                port.zar()
                port = None
                print(f'\n  {time.time() - kezd:6.1f} s  a port eltűnt')
    except KeyboardInterrupt:
        pass
    finally:
        if port:
            port.zar()
    print()
    csv_ir(ki, ['t', 'ms', 'inditas', 'ok', 'i2c_eszkoz', 'chip_id', 'bmi270'], sorok)
    inditasok = sorted({r[2] for r in sorok}, key=int)
    okok = sorted({r[3] for r in sorok})
    print(f'{ki}: {len(sorok)} életjel, {len(inditasok)} különböző indítás ({", ".join(inditasok)}), '
          f'újraindulás oka: {", ".join(okok) or "-"}, port-megszakadás: {elveszett}, '
          f'BMI270: {"megvan" if any(r[6] == "BMI270" for r in sorok) else "nem válaszolt"}')


def main():
    p = argparse.ArgumentParser(description=LEIRAS, formatter_class=argparse.RawDescriptionHelpFormatter)
    al = p.add_subparsers(dest='parancs_nev', required=True)

    def uj(nev, fv, sugo):
        q = al.add_parser(nev, help=sugo, description=sugo)
        q.set_defaults(fv=fv)
        return q

    q = uj('rogzit', rogzit, '100 Hz-es felvétel CSV-be')
    q.add_argument('--port')
    q.add_argument('--ido', type=float, default=10, help='felvétel hossza másodpercben')
    q.add_argument('--ki', help='kimeneti CSV')
    q.add_argument('--parancs', action='append', default=[],
                   help='felvétel előtt küldött parancs: M1 (motor folyamatosan), V0 (rezgés ki), C (nullpont)')
    q.add_argument('--kalibral', action='store_true', help='nullpont az aktuális helyzetben a felvétel előtt')
    q.add_argument('--elokeszites', type=float, default=1.0, help='ennyi másodpercet eldob az elejéről')

    q = uj('nez', nez, 'élő kijelzés')
    q.add_argument('--port')
    q = uj('kalibral', kalibral, 'nullpont az aktuális helyzetben')
    q.add_argument('--port')
    q = uj('szog', szog, 'referenciaszög egy megemelt deszkából: asin(h/l)')
    q.add_argument('--h', type=float, required=True, help='a deszka megemelt végének magassága [mm]')
    q.add_argument('--l', type=float, required=True, help='a deszka hossza a forgáspont és az alátét között [mm]')
    q.add_argument('--pontossag', type=float, default=1.0, help='a magasságmérés pontossága [mm]')

    for nev, fv, sugo in (('statikus', statikus, 'statikus szöghiba és ismételhetőség'),
                          ('zaj', zaj, 'zaj és téves jelzés (pl. motor ki/be)'),
                          ('lepcso', lepcso, 'lépésválasz: új és régi szűrőlánc'),
                          ('utes', utes, 'ütések hatása nyugalmi helyzetben'),
                          ('kuszob', kuszob, 'rövid és tartós küszöbtúllépések, késleltetés'),
                          ('adatut', adatut, 'kapcsolatstabilitás valódi telefonnal')):
        q = uj(nev, fv, sugo)
        q.add_argument('fajlok', nargs='+')
        q.add_argument('--mappa', default='eredmenyek', help='a kimeneti fájlok könyvtára')
        if nev in ('statikus', 'zaj'):
            q.add_argument('--levag', type=float, default=1.0, help='a felvétel elejéről és végéről levágott s')
        if nev == 'lepcso':
            q.add_argument('--stabil', type=float, default=0.3, help='nyugalmi szórásküszöb [fok]')
            q.add_argument('--min-plato', dest='min_plato', type=float, default=1.0, help='[s]')
            q.add_argument('--min-lepes', dest='min_lepes', type=float, default=5.0, help='[fok]')
            q.add_argument('--tures', type=float, default=1.0, help='beállási sáv [fok]')
            q.add_argument('--ablak', type=float, default=3.0, help='a példaábra hossza [s]')
        if nev == 'utes':
            q.add_argument('--ablak', type=float, default=1.0, help='az ütés utáni vizsgált idő [s]')
            q.add_argument('--szunet', type=float, default=0.3, help='ennél közelebbi kilengések egy ütésnek számítanak [s]')
        if nev == 'kuszob':
            q.add_argument('--irany', choices=('be', 'ki'), default='be')
            q.add_argument('--kuszob', type=float, help='alapból a felvételkor érvényes küszöb')
            q.add_argument('--hiszterezis', type=float, default=0.5)
            q.add_argument('--elesites', type=float, default=150.0, help='[ms]')
            q.add_argument('--sav', type=float, default=20.0, help='határeset sávja az élesítési idő körül [ms]')

    q = uj('usbfigyel', usbfigyel, 'az USB-port megjelenése és eltűnése (NYÁK, javítás előtt és után)')
    q.add_argument('--ido', type=float, default=120)
    q.add_argument('--ki')
    q = uj('pcb', pcb, 'a pcb_teszt program életjelei: újraindulások, BMI270')
    q.add_argument('--port')
    q.add_argument('--ido', type=float, default=300)
    q.add_argument('--ki')

    a = p.parse_args()
    a.fv(a)


if __name__ == '__main__':
    main()
