const en = {
  homeTab: 'Live',
  historyTab: 'History',
  settingsTab: 'Settings',

  liveTitle: 'Live tracking',
  ankleAngle: 'Ankle angle',
  ankleTilt: 'Ankle tilt',
  thresholdShort: 'Threshold {value}°',
  gaugeOutward: 'Outward',
  gaugeInward: 'Inward',
  zoneNeutral: 'Neutral',
  zoneInward: 'Inward tilt',
  zoneOutward: 'Outward tilt',
  noData: 'No data',
  realTimeTrend: 'Real-time trend',
  trendTitle: 'Trend',
  last15s: 'Last 15 s',
  inwardThreshold: 'Inward threshold',
  sessionNotificationTitle: 'Ashi measurement running',
  sessionNotificationBody: 'Sensor data is recorded while the screen is off.',
  keepScreenOn: 'Keep screen on',
  keepScreenOnHint:
    'While a session is recording and the app is open. Not needed for background recording.',
  pairingFailed:
    'The sensor needs Bluetooth pairing before its settings can be changed. Enter the sensor PIN when your phone asks for it, then tap Retry.',
  retryAction: 'Retry',
  sectionCloud: 'Cloud sync',
  cloudSync: 'Upload sessions',
  cloudSyncHint:
    'Saved sessions are sent to the Ashi server. They stay on this phone too.',
  serverUrl: 'Server address',
  serverUrlPlaceholder: 'http://192.168.1.20:3000',
  syncNow: 'Sync now',
  syncNever: 'Not synced yet',
  syncLast: 'Last sync {time}',
  syncPending: '{count} waiting to upload',
  syncing: 'Syncing…',
  syncErrorNoServer: 'Enter the server address.',
  syncErrorUnreachable:
    'Server not reachable. Same Wi-Fi? Will retry automatically.',
  syncErrorServer: 'The server rejected the upload. Will retry automatically.',
  deviceId: 'Device ID {id}',
  outwardThreshold: 'Outward threshold',
  outwardThresholdHint:
    'Outward tilt beyond this angle is a fall risk: the sensor gives a double-pulse cue.',
  thresholdsShort: 'In {inward}° · Out {outward}°',
  outwardEvents: 'Outward alerts',
  outwardCaption: 'Fall-risk cues',
  outwardDescription:
    'How many times the ankle tilted outward past the outward threshold. It happens less often than inward tilt but can lead to a sprain or a fall, so the sensor signals it with a distinct double pulse.',
  steps: 'Steps',
  cadence: 'Cadence',
  cadenceValue: '{value} steps/min',
  stepsDescription:
    'Steps in the current session. The sensor detects the ground contacts of the foot it is worn on, and the app counts both feet (×2). Cadence is the step rate over the last 10 seconds.',
  stepsUnsupported: 'Needs firmware v2',
  invertTilt: 'Reverse tilt direction',
  invertTiltHint:
    'Turn on if tilting the foot inward moves the gauge outward (other foot, or board mounted flipped).',
  swapAxes: 'Sensor rotated 90°',
  swapAxesHint:
    'Turn on if the gauge reacts to rocking the foot forward and back instead of sideways.',
  metricsTitle: 'Metrics',
  viewHistory: 'History',
  gettingStarted: 'Getting started',
  step1: 'Switch on the Ashi sensor and make sure it is charged.',
  step2: 'Attach it to the shoe with the arrow pointing forward.',
  step3: 'Keep the phone close and tap “Connect sensor”.',

  stabilityIndex: 'Stability',
  balanceScore: 'Balance score',
  inwardLoad: 'Inward load',
  motorActivations: 'Inward alerts',
  correctionLatency: 'Correction time',
  peakTilt: 'Peak tilt',
  liveLabel: 'Live',
  startToMeasure: 'Start a session',
  activationsCaption: 'Vibration cues',
  correctionCaption: 'Avg. return time',
  peakCaption: 'This session',
  currentValue: 'Current value',
  targetRange: 'Target',
  balanceFormula: 'Stability / inward weight',
  sessionShare: 'Share of session',
  recentShare: 'Last 2.5 s',
  averageCorrection: 'Average correction',
  averageTilt: 'Average tilt',
  metricNeedsSession: 'Start a session to record this metric.',
  stabilityDescription:
    'How steady the ankle is over the last few seconds. Higher means smaller, more controlled movements.',
  balanceDescription:
    'Combined score from stability (70%) and the share of time spent without inward tilt (30%).',
  inwardDescription:
    'Share of the session where the ankle tilted inward beyond the threshold.',
  activationsDescription:
    'How many times the tilt crossed the inward threshold, i.e. how often the sensor gave an inward vibration cue.',
  correctionDescription:
    'Average time it took to return below the threshold after an inward tilt. Shorter is better.',
  peakDescription: 'Largest tilt measured during the current session.',

  sessionTitle: 'Session',
  sessionIdleBody:
    'Record a session to track inward load, corrections and your balance score over time.',
  sessionNeedsData:
    'Connect the sensor (or turn on demo mode) to start a session.',
  startSession: 'Start session',
  recording: 'Recording',
  paused: 'Paused',
  elapsed: 'Elapsed',
  pause: 'Pause',
  resume: 'Resume',
  finish: 'Finish',
  done: 'Done',
  sessionSummaryTitle: 'Session summary',
  duration: 'Duration',
  balanceShort: 'balance',
  avgStability: 'Avg. stability',
  tiltOverSession: 'Tilt during session',
  demoBadge: 'DEMO',

  sensor: 'Ashi sensor',
  connectTitle: 'Connect your sensor',
  connectBody: 'Switch on the sensor and keep it close to your phone.',
  connectDevice: 'Connect sensor',
  connectShort: 'Connect',
  disconnect: 'Disconnect',
  cancel: 'Cancel',
  tryAgain: 'Try again',
  tryDemo: 'Explore with demo data',
  scanningTitle: 'Looking for the sensor…',
  connectingTitle: 'Connecting…',
  reconnectingTitle: 'Reconnecting…',
  scanningBody: 'Keep the sensor switched on and within a couple of metres.',
  connectedSubtitle: 'Connected · streaming live data',
  waitingForData: 'Waiting for data…',
  demoTitle: 'Demo mode',
  demoSubtitle: 'Simulated data, not a real measurement.',
  openSettings: 'Open settings',
  issueBluetoothOff: 'Bluetooth is turned off. Turn it on and try again.',
  issueUnsupported: 'This device does not support Bluetooth Low Energy.',
  issuePermissionDenied: 'Ashi needs Bluetooth permission to find the sensor.',
  issuePermissionBlocked:
    'Bluetooth permission is blocked. Enable it for Ashi in the system settings.',
  issueNotFound:
    'No sensor found. Make sure it is switched on, charged and not connected to another phone.',
  issueConnectFailed: 'Could not connect to the sensor. Please try again.',
  issueConnectionLost: 'Connection to the sensor was lost.',
  issueIncompatible:
    "A device named like the sensor was found, but it doesn't use the Ashi protocol. Flash the Ashi firmware onto it.",
  vibrationFeedback: 'Vibration feedback',
  vibrationFeedbackHint:
    'The sensor vibrates when the foot tilts past the inward or outward threshold (outward: double pulse).',
  calibrate: 'Calibrate zero',
  calibrateHint:
    'Stand still with your foot flat, then tap: this position becomes 0°.',
  calibrateAction: 'Calibrate',
  calibrated: 'Done ✓',
  testVibration: 'Test vibration',
  testAction: 'Test',
  zeroShort: 'Set zero',
  firmwareOutdated:
    'This firmware has no control channel: calibration and vibration settings are unavailable.',

  statusLive: 'Live',
  statusDemo: 'Demo',
  statusNoData: 'No data',
  statusOffline: 'Offline',
  statusConnecting: 'Connecting',
  statusReconnecting: 'Reconnecting',
  statusConnected: 'Connected',
  statusNotConnected: 'Not connected',

  historyTitle: 'History',
  sessionsCountOne: '1 session',
  sessionsCount: '{count} sessions',
  sessionsLabel: 'Sessions',
  totalTime: 'Total time',
  balanceTrend: 'Balance · last {count} sessions',
  historyEmptyTitle: 'No sessions yet',
  historyEmptyBody:
    'Finished sessions are saved here so you can follow your progress.',
  stabilityShort: 'stab. {value}%',
  inwardShort: 'inward {value}%',
  deleteSession: 'Delete session',
  deleteSessionTitle: 'Delete this session?',
  deleteSessionBody: 'This cannot be undone.',
  delete: 'Delete',

  settingsTitle: 'Settings',
  sectionDevice: 'Device',
  sectionMeasurement: 'Measurement',
  sectionData: 'Data',
  sectionAbout: 'About',
  language: 'Language',
  autoReconnect: 'Auto reconnect',
  autoReconnectHint: 'Reconnect automatically if the sensor drops out.',
  batteryValue: 'battery {value}%',
  thresholdHint: 'Tilt above this angle counts as inward load.',
  demoMode: 'Demo mode',
  demoModeHint: 'Use simulated data when no sensor is connected.',
  savedSessions: 'Saved sessions',
  clear: 'Clear',
  clearHistoryTitle: 'Delete all sessions?',
  clearHistoryBody:
    'Your whole session history will be removed from this phone.',
  versionValue: 'Version {value}',
  sensorProtocol: 'Sensor protocol',
  serviceUuid: 'Service',

  today: 'Today',
  yesterday: 'Yesterday',
  monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
  weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
  dateFormat: '{month} {day}',
  hoursMinutes: '{h} h {m} min',
  minutesOnly: '{m} min',
};

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const hu: Dictionary = {
  homeTab: 'Élő',
  historyTab: 'Előzmények',
  settingsTab: 'Beállítások',

  liveTitle: 'Élő mérés',
  ankleAngle: 'Bokaszög',
  ankleTilt: 'Bokadőlés',
  thresholdShort: 'Küszöb {value}°',
  gaugeOutward: 'Kifelé',
  gaugeInward: 'Befelé',
  zoneNeutral: 'Semleges',
  zoneInward: 'Befelé dől',
  zoneOutward: 'Kifelé dől',
  noData: 'Nincs adat',
  realTimeTrend: 'Valós idejű trend',
  trendTitle: 'Trend',
  last15s: 'Utolsó 15 mp',
  inwardThreshold: 'Befelé küszöb',
  sessionNotificationTitle: 'Ashi mérés folyamatban',
  sessionNotificationBody:
    'A szenzor adatai kikapcsolt képernyőnél is rögzülnek.',
  keepScreenOn: 'Képernyő ébren tartása',
  keepScreenOnHint:
    'Mérés közben, amíg az app nyitva van. A háttérben való rögzítéshez nem szükséges.',
  pairingFailed:
    'A szenzor beállításainak módosításához Bluetooth-párosítás kell. Írd be a szenzor PIN-kódját, amikor a telefon kéri, majd koppints az Újra gombra.',
  retryAction: 'Újra',
  sectionCloud: 'Felhő szinkron',
  cloudSync: 'Mérések feltöltése',
  cloudSyncHint:
    'A mentett mérések felkerülnek az Ashi szerverre, a telefonon is megmaradnak.',
  serverUrl: 'Szerver címe',
  serverUrlPlaceholder: 'http://192.168.1.20:3000',
  syncNow: 'Szinkronizálás',
  syncNever: 'Még nem volt szinkronizálva',
  syncLast: 'Utolsó szinkron: {time}',
  syncPending: '{count} feltöltésre vár',
  syncing: 'Szinkronizálás…',
  syncErrorNoServer: 'Add meg a szerver címét.',
  syncErrorUnreachable:
    'A szerver nem érhető el. Ugyanazon a Wi-Fin vagy? Később automatikusan újrapróbálja.',
  syncErrorServer:
    'A szerver elutasította a feltöltést. Később automatikusan újrapróbálja.',
  deviceId: 'Eszközazonosító: {id}',
  outwardThreshold: 'Kifelé küszöb',
  outwardThresholdHint:
    'Az ennél nagyobb kifelé dőlés elesésveszélyes: a szenzor dupla rezgéssel jelez.',
  thresholdsShort: 'Be {inward}° · Ki {outward}°',
  outwardEvents: 'Kifelé jelzések',
  outwardCaption: 'Elesésveszély',
  outwardDescription:
    'Hányszor dőlt a boka kifelé a kifelé küszöbön túl. Ritkább, mint a befelé dőlés, de bokaficamhoz vagy eleséshez vezethet, ezért a szenzor külön, dupla rezgéssel jelzi.',
  steps: 'Lépések',
  cadence: 'Lépésütem',
  cadenceValue: '{value} lépés/perc',
  stepsDescription:
    'Lépések az aktuális mérésben. A szenzor annak a lábnak a talajfogásait érzékeli, amelyiken van, az app mindkét lábat számolja (×2). A lépésütem az utolsó 10 másodperc lépésszáma percre vetítve.',
  stepsUnsupported: 'Firmware v2 szükséges',
  invertTilt: 'Dőlésirány megfordítása',
  invertTiltHint:
    'Kapcsold be, ha befelé döntésnél a mutató kifelé tér ki (másik láb vagy fordítva felszerelt panel).',
  swapAxes: 'Szenzor 90°-kal elforgatva',
  swapAxesHint:
    'Kapcsold be, ha a mutató az előre-hátra billentésre reagál az oldalirányú helyett.',
  metricsTitle: 'Mutatók',
  viewHistory: 'Előzmények',
  gettingStarted: 'Első lépések',
  step1: 'Kapcsold be az Ashi szenzort, és ellenőrizd, hogy fel van-e töltve.',
  step2: 'Rögzítsd a cipőre úgy, hogy a nyíl előre mutasson.',
  step3:
    'Tartsd a telefont a közelben, és koppints a „Szenzor csatlakoztatása” gombra.',

  stabilityIndex: 'Stabilitás',
  balanceScore: 'Egyensúly pontszám',
  inwardLoad: 'Befelé terhelés',
  motorActivations: 'Befelé jelzések',
  correctionLatency: 'Korrekciós idő',
  peakTilt: 'Max. dőlés',
  liveLabel: 'Élő',
  startToMeasure: 'Indíts egy mérést',
  activationsCaption: 'Rezgéses jelzés',
  correctionCaption: 'Átl. visszatérési idő',
  peakCaption: 'Ebben a mérésben',
  currentValue: 'Jelenlegi érték',
  targetRange: 'Cél',
  balanceFormula: 'Stabilitás / befelé súly',
  sessionShare: 'A mérés arányában',
  recentShare: 'Utolsó 2,5 mp',
  averageCorrection: 'Átlagos korrekció',
  averageTilt: 'Átlagos dőlés',
  metricNeedsSession: 'Ennek a mutatónak a rögzítéséhez indíts egy mérést.',
  stabilityDescription:
    'Mennyire stabil a boka az elmúlt néhány másodpercben. A magasabb érték kisebb, kontrolláltabb mozgást jelent.',
  balanceDescription:
    'Összesített pontszám a stabilitásból (70%) és a befelé dőlés nélkül töltött idő arányából (30%).',
  inwardDescription:
    'A mérés azon része, amikor a boka a küszöbnél jobban befelé dőlt.',
  activationsDescription:
    'Hányszor lépte át a dőlés a befelé küszöböt, azaz hányszor adott a szenzor befelé jelző rezgést.',
  correctionDescription:
    'Átlagosan mennyi idő alatt tért vissza a boka a küszöb alá egy befelé dőlés után. A rövidebb a jobb.',
  peakDescription: 'Az aktuális mérés során mért legnagyobb dőlés.',

  sessionTitle: 'Mérés',
  sessionIdleBody:
    'Rögzíts egy mérést, hogy követni tudd a befelé terhelést, a korrekciókat és az egyensúly pontszámodat.',
  sessionNeedsData:
    'Csatlakoztasd a szenzort (vagy kapcsold be a demó módot) a méréshez.',
  startSession: 'Mérés indítása',
  recording: 'Rögzítés',
  paused: 'Szüneteltetve',
  elapsed: 'Eltelt idő',
  pause: 'Szünet',
  resume: 'Folytatás',
  finish: 'Befejezés',
  done: 'Kész',
  sessionSummaryTitle: 'Mérés összegzése',
  duration: 'Időtartam',
  balanceShort: 'egyensúly',
  avgStability: 'Átl. stabilitás',
  tiltOverSession: 'Dőlés a mérés alatt',
  demoBadge: 'DEMÓ',

  sensor: 'Ashi szenzor',
  connectTitle: 'Csatlakoztasd a szenzort',
  connectBody: 'Kapcsold be a szenzort, és tartsd a telefon közelében.',
  connectDevice: 'Szenzor csatlakoztatása',
  connectShort: 'Csatlakozás',
  disconnect: 'Leválasztás',
  cancel: 'Mégse',
  tryAgain: 'Újrapróbálás',
  tryDemo: 'Kipróbálás demó adatokkal',
  scanningTitle: 'Szenzor keresése…',
  connectingTitle: 'Csatlakozás…',
  reconnectingTitle: 'Újracsatlakozás…',
  scanningBody:
    'Tartsd bekapcsolva a szenzort, legfeljebb pár méterre a telefontól.',
  connectedSubtitle: 'Csatlakoztatva · élő adat',
  waitingForData: 'Várakozás adatra…',
  demoTitle: 'Demó mód',
  demoSubtitle: 'Szimulált adatok, nem valódi mérés.',
  openSettings: 'Beállítások megnyitása',
  issueBluetoothOff:
    'A Bluetooth ki van kapcsolva. Kapcsold be, majd próbáld újra.',
  issueUnsupported: 'Ez az eszköz nem támogatja a Bluetooth Low Energy-t.',
  issuePermissionDenied:
    'A szenzor kereséséhez az Ashinak Bluetooth engedély kell.',
  issuePermissionBlocked:
    'A Bluetooth engedély le van tiltva. Engedélyezd az Ashi számára a rendszerbeállításokban.',
  issueNotFound:
    'Nem található szenzor. Ellenőrizd, hogy be van-e kapcsolva, fel van-e töltve, és nincs-e másik telefonhoz csatlakozva.',
  issueConnectFailed: 'Nem sikerült csatlakozni a szenzorhoz. Próbáld újra.',
  issueConnectionLost: 'Megszakadt a kapcsolat a szenzorral.',
  issueIncompatible:
    'Találtunk egy szenzor nevű eszközt, de nem az Ashi protokollt használja. Töltsd rá az Ashi firmware-t.',
  vibrationFeedback: 'Rezgő visszajelzés',
  vibrationFeedbackHint:
    'A szenzor rezeg, ha a láb a befelé vagy a kifelé küszöbön túl dől (kifelé: dupla rezgés).',
  calibrate: 'Nullpont kalibrálása',
  calibrateHint:
    'Állj egyenesen, a talp legyen a földön, majd koppints: ez a helyzet lesz a 0°.',
  calibrateAction: 'Kalibrálás',
  calibrated: 'Kész ✓',
  testVibration: 'Rezgés tesztelése',
  testAction: 'Teszt',
  zeroShort: 'Nullázás',
  firmwareOutdated:
    'Ez a firmware nem támogatja a vezérlést: a kalibrálás és a rezgés beállításai nem érhetők el.',

  statusLive: 'Élő',
  statusDemo: 'Demó',
  statusNoData: 'Nincs adat',
  statusOffline: 'Offline',
  statusConnecting: 'Csatlakozás',
  statusReconnecting: 'Újracsatlakozás',
  statusConnected: 'Csatlakoztatva',
  statusNotConnected: 'Nincs csatlakoztatva',

  historyTitle: 'Előzmények',
  sessionsCountOne: '1 mérés',
  sessionsCount: '{count} mérés',
  sessionsLabel: 'Mérések',
  totalTime: 'Összes idő',
  balanceTrend: 'Egyensúly · utolsó {count} mérés',
  historyEmptyTitle: 'Még nincs mérés',
  historyEmptyBody:
    'A befejezett mérések itt jelennek meg, így követheted a fejlődésedet.',
  stabilityShort: 'stab. {value}%',
  inwardShort: 'befelé {value}%',
  deleteSession: 'Mérés törlése',
  deleteSessionTitle: 'Törlöd ezt a mérést?',
  deleteSessionBody: 'Ez nem vonható vissza.',
  delete: 'Törlés',

  settingsTitle: 'Beállítások',
  sectionDevice: 'Eszköz',
  sectionMeasurement: 'Mérés',
  sectionData: 'Adatok',
  sectionAbout: 'Névjegy',
  language: 'Nyelv',
  autoReconnect: 'Automatikus újracsatlakozás',
  autoReconnectHint: 'Ha megszakad a kapcsolat, automatikusan újracsatlakozik.',
  batteryValue: 'akku {value}%',
  thresholdHint: 'Az e feletti dőlés számít befelé terhelésnek.',
  demoMode: 'Demó mód',
  demoModeHint: 'Szimulált adatok, ha nincs csatlakoztatott szenzor.',
  savedSessions: 'Mentett mérések',
  clear: 'Törlés',
  clearHistoryTitle: 'Törlöd az összes mérést?',
  clearHistoryBody: 'A teljes mérési előzmény törlődik erről a telefonról.',
  versionValue: 'Verzió {value}',
  sensorProtocol: 'Szenzor protokoll',
  serviceUuid: 'Szolgáltatás',

  today: 'Ma',
  yesterday: 'Tegnap',
  monthsShort:
    'jan.,febr.,márc.,ápr.,máj.,jún.,júl.,aug.,szept.,okt.,nov.,dec.',
  weekdays: 'vasárnap,hétfő,kedd,szerda,csütörtök,péntek,szombat',
  dateFormat: '{month} {day}.',
  hoursMinutes: '{h} ó {m} p',
  minutesOnly: '{m} perc',
};

const de: Dictionary = {
  homeTab: 'Live',
  historyTab: 'Verlauf',
  settingsTab: 'Einstellungen',

  liveTitle: 'Live-Messung',
  ankleAngle: 'Knöchelwinkel',
  ankleTilt: 'Knöchelneigung',
  thresholdShort: 'Schwelle {value}°',
  gaugeOutward: 'Außen',
  gaugeInward: 'Innen',
  zoneNeutral: 'Neutral',
  zoneInward: 'Neigung innen',
  zoneOutward: 'Neigung außen',
  noData: 'Keine Daten',
  realTimeTrend: 'Echtzeit-Trend',
  trendTitle: 'Trend',
  last15s: 'Letzte 15 s',
  inwardThreshold: 'Einwärts-Schwelle',
  sessionNotificationTitle: 'Ashi-Messung läuft',
  sessionNotificationBody:
    'Sensordaten werden auch bei ausgeschaltetem Bildschirm aufgezeichnet.',
  keepScreenOn: 'Bildschirm anlassen',
  keepScreenOnHint:
    'Während einer Aufzeichnung bei geöffneter App. Für die Aufzeichnung im Hintergrund nicht nötig.',
  pairingFailed:
    'Der Sensor muss per Bluetooth gekoppelt werden, bevor seine Einstellungen geändert werden können. Gib die Sensor-PIN ein, wenn das Telefon danach fragt, und tippe auf Erneut.',
  retryAction: 'Erneut',
  sectionCloud: 'Cloud-Sync',
  cloudSync: 'Sitzungen hochladen',
  cloudSyncHint:
    'Gespeicherte Sitzungen werden an den Ashi-Server gesendet und bleiben auch auf dem Telefon.',
  serverUrl: 'Serveradresse',
  serverUrlPlaceholder: 'http://192.168.1.20:3000',
  syncNow: 'Jetzt synchronisieren',
  syncNever: 'Noch nicht synchronisiert',
  syncLast: 'Letzte Synchronisierung {time}',
  syncPending: '{count} warten auf Upload',
  syncing: 'Synchronisiere…',
  syncErrorNoServer: 'Gib die Serveradresse ein.',
  syncErrorUnreachable:
    'Server nicht erreichbar. Gleiches WLAN? Wird automatisch erneut versucht.',
  syncErrorServer:
    'Der Server hat den Upload abgelehnt. Wird automatisch erneut versucht.',
  deviceId: 'Geräte-ID {id}',
  outwardThreshold: 'Auswärts-Schwelle',
  outwardThresholdHint:
    'Auswärtsneigung über diesem Winkel ist ein Sturzrisiko: der Sensor gibt einen Doppelimpuls.',
  thresholdsShort: 'Innen {inward}° · Außen {outward}°',
  outwardEvents: 'Auswärts-Warnungen',
  outwardCaption: 'Sturzrisiko',
  outwardDescription:
    'Wie oft der Knöchel über die Auswärts-Schwelle nach außen gekippt ist. Das kommt seltener vor als Einwärtsneigung, kann aber zu Verstauchung oder Sturz führen, daher meldet der Sensor es mit einem eigenen Doppelimpuls.',
  steps: 'Schritte',
  cadence: 'Kadenz',
  cadenceValue: '{value} Schritte/min',
  stepsDescription:
    'Schritte in der aktuellen Sitzung. Der Sensor erkennt die Bodenkontakte des Fußes, an dem er sitzt; die App zählt beide Füße (×2). Die Kadenz ist die Schrittfrequenz der letzten 10 Sekunden.',
  stepsUnsupported: 'Firmware v2 nötig',
  invertTilt: 'Neigungsrichtung umkehren',
  invertTiltHint:
    'Einschalten, wenn die Anzeige bei Einwärtsneigung nach außen ausschlägt (anderer Fuß oder Platine verkehrt montiert).',
  swapAxes: 'Sensor um 90° gedreht',
  swapAxesHint:
    'Einschalten, wenn die Anzeige auf Vor-/Rückkippen statt auf seitliches Kippen reagiert.',
  metricsTitle: 'Kennzahlen',
  viewHistory: 'Verlauf',
  gettingStarted: 'Erste Schritte',
  step1: 'Schalte den Ashi-Sensor ein und prüfe, ob er geladen ist.',
  step2: 'Befestige ihn am Schuh, der Pfeil zeigt nach vorne.',
  step3: 'Halte das Handy in der Nähe und tippe auf „Sensor verbinden“.',

  stabilityIndex: 'Stabilität',
  balanceScore: 'Balance-Wert',
  inwardLoad: 'Einwärtslast',
  motorActivations: 'Einwärts-Warnungen',
  correctionLatency: 'Korrekturzeit',
  peakTilt: 'Max. Neigung',
  liveLabel: 'Live',
  startToMeasure: 'Sitzung starten',
  activationsCaption: 'Vibrationshinweise',
  correctionCaption: 'Ø Rückkehrzeit',
  peakCaption: 'Diese Sitzung',
  currentValue: 'Aktueller Wert',
  targetRange: 'Ziel',
  balanceFormula: 'Stabilität / Einwärts-Gewicht',
  sessionShare: 'Anteil der Sitzung',
  recentShare: 'Letzte 2,5 s',
  averageCorrection: 'Ø Korrektur',
  averageTilt: 'Ø Neigung',
  metricNeedsSession: 'Starte eine Sitzung, um diese Kennzahl aufzuzeichnen.',
  stabilityDescription:
    'Wie ruhig der Knöchel in den letzten Sekunden ist. Höher bedeutet kleinere, kontrolliertere Bewegungen.',
  balanceDescription:
    'Kombinierter Wert aus Stabilität (70 %) und dem Zeitanteil ohne Einwärtsneigung (30 %).',
  inwardDescription:
    'Anteil der Sitzung, in dem der Knöchel stärker als die Schwelle nach innen geneigt war.',
  activationsDescription:
    'Wie oft die Neigung die Einwärts-Schwelle überschritten hat, also wie oft der Sensor einen Einwärts-Vibrationshinweis gegeben hat.',
  correctionDescription:
    'Durchschnittliche Zeit, bis die Neigung nach einem Einwärtskippen wieder unter der Schwelle lag. Kürzer ist besser.',
  peakDescription: 'Größte gemessene Neigung in der aktuellen Sitzung.',

  sessionTitle: 'Sitzung',
  sessionIdleBody:
    'Zeichne eine Sitzung auf, um Einwärtslast, Korrekturen und deinen Balance-Wert zu verfolgen.',
  sessionNeedsData:
    'Verbinde den Sensor (oder aktiviere den Demo-Modus), um zu starten.',
  startSession: 'Sitzung starten',
  recording: 'Aufnahme',
  paused: 'Pausiert',
  elapsed: 'Vergangen',
  pause: 'Pause',
  resume: 'Fortsetzen',
  finish: 'Beenden',
  done: 'Fertig',
  sessionSummaryTitle: 'Sitzungsübersicht',
  duration: 'Dauer',
  balanceShort: 'Balance',
  avgStability: 'Ø Stabilität',
  tiltOverSession: 'Neigung während der Sitzung',
  demoBadge: 'DEMO',

  sensor: 'Ashi-Sensor',
  connectTitle: 'Sensor verbinden',
  connectBody:
    'Schalte den Sensor ein und halte ihn in der Nähe deines Handys.',
  connectDevice: 'Sensor verbinden',
  connectShort: 'Verbinden',
  disconnect: 'Trennen',
  cancel: 'Abbrechen',
  tryAgain: 'Erneut versuchen',
  tryDemo: 'Mit Demo-Daten testen',
  scanningTitle: 'Sensor wird gesucht…',
  connectingTitle: 'Verbinde…',
  reconnectingTitle: 'Verbinde erneut…',
  scanningBody:
    'Lass den Sensor eingeschaltet und höchstens ein paar Meter entfernt.',
  connectedSubtitle: 'Verbunden · Live-Daten',
  waitingForData: 'Warte auf Daten…',
  demoTitle: 'Demo-Modus',
  demoSubtitle: 'Simulierte Daten, keine echte Messung.',
  openSettings: 'Einstellungen öffnen',
  issueBluetoothOff:
    'Bluetooth ist ausgeschaltet. Schalte es ein und versuche es erneut.',
  issueUnsupported: 'Dieses Gerät unterstützt kein Bluetooth Low Energy.',
  issuePermissionDenied:
    'Ashi benötigt die Bluetooth-Berechtigung, um den Sensor zu finden.',
  issuePermissionBlocked:
    'Die Bluetooth-Berechtigung ist blockiert. Aktiviere sie für Ashi in den Systemeinstellungen.',
  issueNotFound:
    'Kein Sensor gefunden. Prüfe, ob er eingeschaltet, geladen und nicht mit einem anderen Handy verbunden ist.',
  issueConnectFailed:
    'Verbindung zum Sensor fehlgeschlagen. Bitte erneut versuchen.',
  issueConnectionLost: 'Die Verbindung zum Sensor wurde unterbrochen.',
  issueIncompatible:
    'Ein Gerät mit Sensornamen wurde gefunden, nutzt aber nicht das Ashi-Protokoll. Spiele die Ashi-Firmware auf.',
  vibrationFeedback: 'Vibrationsfeedback',
  vibrationFeedbackHint:
    'Der Sensor vibriert, wenn der Fuß über die Einwärts- oder Auswärts-Schwelle kippt (außen: Doppelimpuls).',
  calibrate: 'Nullpunkt kalibrieren',
  calibrateHint:
    'Stelle dich ruhig mit flachem Fuß hin und tippe: diese Position wird 0°.',
  calibrateAction: 'Kalibrieren',
  calibrated: 'Fertig ✓',
  testVibration: 'Vibration testen',
  testAction: 'Test',
  zeroShort: 'Nullen',
  firmwareOutdated:
    'Diese Firmware hat keinen Steuerkanal: Kalibrierung und Vibration sind nicht verfügbar.',

  statusLive: 'Live',
  statusDemo: 'Demo',
  statusNoData: 'Keine Daten',
  statusOffline: 'Offline',
  statusConnecting: 'Verbinde',
  statusReconnecting: 'Verbinde erneut',
  statusConnected: 'Verbunden',
  statusNotConnected: 'Nicht verbunden',

  historyTitle: 'Verlauf',
  sessionsCountOne: '1 Sitzung',
  sessionsCount: '{count} Sitzungen',
  sessionsLabel: 'Sitzungen',
  totalTime: 'Gesamtzeit',
  balanceTrend: 'Balance · letzte {count} Sitzungen',
  historyEmptyTitle: 'Noch keine Sitzungen',
  historyEmptyBody:
    'Beendete Sitzungen werden hier gespeichert, damit du deinen Fortschritt siehst.',
  stabilityShort: 'Stab. {value} %',
  inwardShort: 'einwärts {value} %',
  deleteSession: 'Sitzung löschen',
  deleteSessionTitle: 'Diese Sitzung löschen?',
  deleteSessionBody: 'Das kann nicht rückgängig gemacht werden.',
  delete: 'Löschen',

  settingsTitle: 'Einstellungen',
  sectionDevice: 'Gerät',
  sectionMeasurement: 'Messung',
  sectionData: 'Daten',
  sectionAbout: 'Info',
  language: 'Sprache',
  autoReconnect: 'Automatisch neu verbinden',
  autoReconnectHint: 'Bei Verbindungsabbruch automatisch neu verbinden.',
  batteryValue: 'Akku {value} %',
  thresholdHint: 'Neigung über diesem Winkel zählt als Einwärtslast.',
  demoMode: 'Demo-Modus',
  demoModeHint: 'Simulierte Daten, wenn kein Sensor verbunden ist.',
  savedSessions: 'Gespeicherte Sitzungen',
  clear: 'Löschen',
  clearHistoryTitle: 'Alle Sitzungen löschen?',
  clearHistoryBody: 'Dein gesamter Verlauf wird von diesem Handy entfernt.',
  versionValue: 'Version {value}',
  sensorProtocol: 'Sensorprotokoll',
  serviceUuid: 'Service',

  today: 'Heute',
  yesterday: 'Gestern',
  monthsShort: 'Jan.,Feb.,März,Apr.,Mai,Juni,Juli,Aug.,Sept.,Okt.,Nov.,Dez.',
  weekdays: 'Sonntag,Montag,Dienstag,Mittwoch,Donnerstag,Freitag,Samstag',
  dateFormat: '{day}. {month}',
  hoursMinutes: '{h} Std. {m} Min.',
  minutesOnly: '{m} Min.',
};

export const translations = {en: en as Dictionary, hu, de};

export type Language = keyof typeof translations;

type TranslationParams = Record<string, string | number>;

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in params ? String(params[key]) : match,
  );
};

export const translate = (
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
) => {
  const dictionary = translations[language] ?? translations.en;
  const template = dictionary[key] ?? translations.en[key];
  return interpolate(template, params);
};
