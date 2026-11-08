/*
 * [S2] Electronic Cats MPU6050 library v1.4.4
 *      https://github.com/ElectronicCats/mpu6050
 *      initialize(), testConnection(), getMotion6(), setDLPFMode(),
 *      setFullScaleAccelRange(), setFullScaleGyroRange()  (src/MPU6050.h)
 * [S3] Arduino MadgwickAHRS library v1.2.0
 *      https://github.com/arduino-libraries/MadgwickAHRS
 *      Wraps S. Madgwick's IMU algorithm (x-io Technologies, GPL), see
 *      http://www.x-io.co.uk/open-source-imu-and-ahrs-algorithms/ and
 *      S. O. H. Madgwick, "An efficient orientation filter for inertial and
 *      inertial/magnetic sensor arrays", 2010.
 *      Facts relied on (src/MadgwickAHRS.h / .cpp):
 *        - begin(f) only sets invSampleFreq = 1/f  -> called every sample
 *          with the measured dt (variable-rate integration)
 *        - updateIMU() takes gyro in deg/s and skips the accelerometer
 *          correction when ax = ay = az = 0  -> used for impact rejection
 *        - beta (gain) is fixed at 0.1 (betaDef), not settable
 * [S5] Acceleration rejection idea (ignore the accelerometer while |a| is far
 *      from 1 g): x-io Technologies Fusion library, "acceleration rejection"
 *      https://github.com/xioTechnologies/Fusion  (concept only, no code copied)
 * [S6] BLE server / notify / advertising structure follows the Espressif
 *      Arduino-ESP32 BLE examples "Server" and "Notify":
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE/examples
 *      (installed locally under ~/Library/Arduino15/packages/esp32/hardware/esp32/3.3.8)
 * [S8] Static-passkey pairing follows the Espressif example
 *      "Server_secure_static_passkey" (same examples folder as [S6]):
 *      BLESecurity::setPassKey / setCapability / setAuthenticationMode,
 *      PROPERTY_WRITE_AUTHEN (NimBLE) + setAccessPermissions (Bluedroid).
 */

#include <Wire.h>
#include <MPU6050.h>        // [S2]
#include <MadgwickAHRS.h>   // [S3]
#include <Preferences.h>

#include <BLEDevice.h>      // [S6]
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLESecurity.h>  // [S8]
#if !defined(CONFIG_NIMBLE_ENABLED)
#include <BLE2902.h>
#endif

#define DEVICE_NAME "Ashi-Sensor"
#define FW_VERSION "2.0"

#define BOARD_BREADBOARD_S3 1
#define BOARD_PCB 2
#define BOARD BOARD_BREADBOARD_S3

#if BOARD == BOARD_BREADBOARD_S3
#define SDA_PIN 18
#define SCL_PIN 17
#define VIB_PIN 10
#define BATTERY_PIN -1
#elif BOARD == BOARD_PCB
#error "Fill in the PCB pins (SDA_PIN, SCL_PIN, VIB_PIN, BATTERY_PIN) from its schematic, then remove this line."
#endif

#define BLE_REQUIRE_PIN 1
#define BLE_PIN 246810

#define SAMPLE_RATE_HZ 100
#define NOTIFY_RATE_HZ 25
#define SERIAL_RATE_HZ 10

#define ACCEL_LSB_PER_G 4096.0f
#define GYRO_LSB_PER_DPS 32.8f

#define ACCEL_LPF_ALPHA 0.3f

// Impact rejection [S5]: outside this band the accelerometer isn't measuring
// just gravity, so the filter runs on the gyro alone for that sample.
#define ACC_GATE_MIN_G 0.85f
#define ACC_GATE_MAX_G 1.15f

#define STEP_HIGH_G 1.3f
#define STEP_LOW_G 1.1f
#define STEP_MIN_INTERVAL_MS 250

#define VIB_ARM_MS 150
#define VIB_HYSTERESIS_DEG 0.5f

#define DEFAULT_INWARD_THRESHOLD 8
#define DEFAULT_OUTWARD_THRESHOLD 10

#define MOUNT_INVERT 0x01
#define MOUNT_SWAP_AXES 0x02

#define SERVICE_UUID         "12345678-1234-5678-1234-56789abcdef0"
#define SENSOR_CHAR_UUID     "abcdef01-1234-5678-1234-56789abcdef0"
#define CONTROL_CHAR_UUID    "abcdef02-1234-5678-1234-56789abcdef0"

enum TiltSide { SIDE_NONE, SIDE_INWARD, SIDE_OUTWARD };

MPU6050 mpu;
Madgwick filter;
Preferences prefs;

BLEServer *server = nullptr;
BLECharacteristic *sensorChar = nullptr;
BLECharacteristic *controlChar = nullptr;

volatile bool deviceConnected = false;
volatile bool restartAdvertising = false;
volatile bool calibrateRequested = false;
volatile bool testBuzzRequested = false;

bool imuOk = false;

float gyroBiasX = 0, gyroBiasY = 0, gyroBiasZ = 0;
float fAx = 0, fAy = 0, fAz = 1;

float offsetRoll = 0, offsetPitch = 0;
uint8_t mountFlags = 0;

float tilt = 0;
float pitch = 0;
int inwardThreshold = DEFAULT_INWARD_THRESHOLD;
int outwardThreshold = DEFAULT_OUTWARD_THRESHOLD;
bool vibrationEnabled = true;

uint16_t strikeCount = 0;
bool strikeHigh = false;
unsigned long lastStrikeMs = 0;
float accPeakSinceSerial = 0;
uint32_t gatedSamples = 0, totalSamples = 0;

const int WINDOW = 64;
float tiltWindow[WINDOW];
int windowCount = 0, windowIndex = 0;

unsigned long lastSampleUs = 0, lastNotifyMs = 0, lastSerialMs = 0;
unsigned long testBuzzUntil = 0;
unsigned long lastBatteryMs = 0;
uint8_t batteryPercent = 255;

float lowPass(float current, float previous, float alpha) {
  return previous + alpha * (current - previous);
}

void calibrateAtRest(float &ax0, float &ay0, float &az0) {
  Serial.println("[IMU] calibrating, keep the sensor still...");
  const int N = 500;
  long gx = 0, gy = 0, gz = 0;
  float sx = 0, sy = 0, sz = 0;
  for (int i = 0; i < N; i++) {
    int16_t ax, ay, az, rx, ry, rz;
    mpu.getMotion6(&ax, &ay, &az, &rx, &ry, &rz);  // [S2]
    gx += rx;
    gy += ry;
    gz += rz;
    sx += ax / ACCEL_LSB_PER_G;
    sy += ay / ACCEL_LSB_PER_G;
    sz += az / ACCEL_LSB_PER_G;
    delay(2);
  }
  gyroBiasX = gx / (float)N;
  gyroBiasY = gy / (float)N;
  gyroBiasZ = gz / (float)N;
  ax0 = sx / N;
  ay0 = sy / N;
  az0 = sz / N;
  Serial.printf("[IMU] gyro bias %.1f %.1f %.1f LSB, gravity %.2f %.2f %.2f g\n", gyroBiasX,
                gyroBiasY, gyroBiasZ, ax0, ay0, az0);
}

// Madgwick starts from a level orientation and, with beta = 0.1, needs several
// seconds to reach the real angle. Iterate on the resting gravity vector
// first: big steps to get close, small steps to settle. Uses only the public
// begin()/updateIMU() API [S3].
void warmUpFilter(float ax0, float ay0, float az0) {
  filter.begin(10.0f);
  for (int i = 0; i < 200; i++) filter.updateIMU(0, 0, 0, ax0, ay0, az0);
  filter.begin(SAMPLE_RATE_HZ);
  for (int i = 0; i < 200; i++) filter.updateIMU(0, 0, 0, ax0, ay0, az0);
  Serial.printf("[IMU] filter ready, roll %.1f pitch %.1f\n", filter.getRoll(), filter.getPitch());
}

uint8_t readBattery() {
#if BATTERY_PIN >= 0
  static float smoothed = -1;
  uint32_t mv = 0;
  for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(BATTERY_PIN);
  float volts = mv / 16.0f * 2.0f / 1000.0f;
  smoothed = smoothed < 0 ? volts : smoothed + 0.05f * (volts - smoothed);
  return (uint8_t)constrain((smoothed - 3.3f) / (4.2f - 3.3f) * 100.0f, 0, 100);
#else
  return 255;
#endif
}

void pushWindow(float value) {
  tiltWindow[windowIndex] = value;
  windowIndex = (windowIndex + 1) % WINDOW;
  if (windowCount < WINDOW) windowCount++;
}

uint16_t windowStability() {
  if (windowCount < 5) return 100;
  float mean = 0;
  for (int i = 0; i < windowCount; i++) mean += tiltWindow[i];
  mean /= windowCount;
  float var = 0;
  for (int i = 0; i < windowCount; i++) var += sq(tiltWindow[i] - mean);
  float sd = sqrt(var / windowCount);
  return (uint16_t)constrain(100.0f - sd * 10.0f, 0, 100);
}

uint8_t windowInwardPercent() {
  if (windowCount == 0) return 0;
  int inward = 0;
  for (int i = 0; i < windowCount; i++)
    if (tiltWindow[i] > inwardThreshold) inward++;
  return (uint8_t)(inward * 100 / windowCount);
}

void putInt16(uint8_t *p, float value) {
  int16_t v = (int16_t)constrain(lroundf(value * 100.0f), -32768, 32767);
  p[0] = (uint8_t)((v >> 8) & 0xFF);
  p[1] = (uint8_t)(v & 0xFF);
}

void sendPacket() {
  uint8_t packet[10];
  putInt16(packet, tilt);
  putInt16(packet + 2, pitch);
  uint16_t stability = windowStability();
  packet[4] = stability >> 8;
  packet[5] = stability & 0xFF;
  packet[6] = windowInwardPercent();
  packet[7] = batteryPercent;
  packet[8] = strikeCount >> 8;
  packet[9] = strikeCount & 0xFF;
  sensorChar->setValue(packet, sizeof(packet));
  sensorChar->notify();
}

void detectStrike(float accMag, unsigned long nowMs) {
  if (!strikeHigh && accMag > STEP_HIGH_G && nowMs - lastStrikeMs >= STEP_MIN_INTERVAL_MS) {
    strikeHigh = true;
    lastStrikeMs = nowMs;
    strikeCount++;
  } else if (strikeHigh && accMag < STEP_LOW_G) {
    strikeHigh = false;
  }
}

void updateImu(unsigned long nowUs, unsigned long nowMs) {
  float dt = (nowUs - lastSampleUs) / 1000000.0f;
  lastSampleUs = nowUs;
  dt = constrain(dt, 0.001f, 0.05f);

  int16_t rax, ray, raz, rgx, rgy, rgz;
  mpu.getMotion6(&rax, &ray, &raz, &rgx, &rgy, &rgz);  // [S2]

  float ax = rax / ACCEL_LSB_PER_G;
  float ay = ray / ACCEL_LSB_PER_G;
  float az = raz / ACCEL_LSB_PER_G;
  float gx = (rgx - gyroBiasX) / GYRO_LSB_PER_DPS;
  float gy = (rgy - gyroBiasY) / GYRO_LSB_PER_DPS;
  float gz = (rgz - gyroBiasZ) / GYRO_LSB_PER_DPS;

  float accMag = sqrtf(ax * ax + ay * ay + az * az);
  if (accMag > accPeakSinceSerial) accPeakSinceSerial = accMag;
  detectStrike(accMag, nowMs);

  fAx = lowPass(ax, fAx, ACCEL_LPF_ALPHA);
  fAy = lowPass(ay, fAy, ACCEL_LPF_ALPHA);
  fAz = lowPass(az, fAz, ACCEL_LPF_ALPHA);

  totalSamples++;
  bool accTrusted = accMag > ACC_GATE_MIN_G && accMag < ACC_GATE_MAX_G;
  if (!accTrusted) gatedSamples++;

  filter.begin(1.0f / dt);  // measured dt, see [S3]
  if (accTrusted) {
    filter.updateIMU(gx, gy, gz, fAx, fAy, fAz);
  } else {
    filter.updateIMU(gx, gy, gz, 0, 0, 0);  // gyro only [S3][S5]
  }

  float rawRoll = filter.getRoll();
  float rawPitch = filter.getPitch();

  if (calibrateRequested) {
    calibrateRequested = false;
    offsetRoll = rawRoll;
    offsetPitch = rawPitch;
    prefs.putFloat("offR", offsetRoll);
    prefs.putFloat("offP", offsetPitch);
    Serial.printf("[CTRL] calibrated, offsets roll %.2f pitch %.2f\n", offsetRoll, offsetPitch);
  }

  float r = rawRoll - offsetRoll;
  float p = rawPitch - offsetPitch;
  if (mountFlags & MOUNT_SWAP_AXES) {
    float tmp = r;
    r = p;
    p = tmp;
  }
  float sign = (mountFlags & MOUNT_INVERT) ? -1.0f : 1.0f;
  tilt = sign * r;
  pitch = p;
}

TiltSide rawSide(TiltSide current) {
  float inEnter = inwardThreshold;
  float outEnter = -(float)outwardThreshold;
  if (current == SIDE_INWARD && tilt > inEnter - VIB_HYSTERESIS_DEG) return SIDE_INWARD;
  if (current == SIDE_OUTWARD && tilt < outEnter + VIB_HYSTERESIS_DEG) return SIDE_OUTWARD;
  if (tilt > inEnter) return SIDE_INWARD;
  if (tilt < outEnter) return SIDE_OUTWARD;
  return SIDE_NONE;
}

bool patternOn(TiltSide side, float excess, unsigned long elapsed) {
  if (side == SIDE_INWARD) {
    if (excess > 15) return true;
    unsigned long half = excess > 7 ? 200 : 500;
    return (elapsed / half) % 2 == 0;
  }
  if (excess > 10) return true;
  unsigned long phase = elapsed % 700;
  return phase < 90 || (phase >= 180 && phase < 270);
}

void updateVibration(unsigned long nowMs) {
  if (nowMs < testBuzzUntil) {
    digitalWrite(VIB_PIN, HIGH);
    return;
  }

  static TiltSide side = SIDE_NONE;
  static TiltSide pending = SIDE_NONE;
  static unsigned long pendingSince = 0, alertSince = 0;

  TiltSide raw = (vibrationEnabled && imuOk) ? rawSide(pending) : SIDE_NONE;
  if (raw != pending) {
    pending = raw;
    pendingSince = nowMs;
  }

  if (pending == SIDE_NONE) {
    side = SIDE_NONE;
  } else if (pending != side && nowMs - pendingSince >= VIB_ARM_MS) {
    side = pending;
    alertSince = nowMs;
  }

  if (side == SIDE_NONE) {
    digitalWrite(VIB_PIN, LOW);
    return;
  }
  float excess = side == SIDE_INWARD ? tilt - inwardThreshold : -tilt - outwardThreshold;
  digitalWrite(VIB_PIN, patternOn(side, excess, nowMs - alertSince) ? HIGH : LOW);
}

// ---------------------------------------------------------------- BLE [S6]

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    deviceConnected = true;
    Serial.println("[BLE] phone connected");
  }
  void onDisconnect(BLEServer *) override {
    deviceConnected = false;
    restartAdvertising = true;
    Serial.println("[BLE] phone disconnected");
  }
};

class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String value = c->getValue();
    if (value.length() == 0) return;
    uint8_t op = (uint8_t)value[0];
    uint8_t arg = value.length() > 1 ? (uint8_t)value[1] : 0;

    switch (op) {
      case 0x01:
        inwardThreshold = constrain((int)arg, 3, 15);
        prefs.putInt("threshold", inwardThreshold);
        Serial.printf("[CTRL] inward threshold = %d\n", inwardThreshold);
        break;
      case 0x02:
        calibrateRequested = true;
        break;
      case 0x03:
        vibrationEnabled = arg != 0;
        prefs.putBool("vibration", vibrationEnabled);
        Serial.printf("[CTRL] vibration = %d\n", vibrationEnabled);
        break;
      case 0x04:
        testBuzzRequested = true;
        break;
      case 0x05:
        outwardThreshold = constrain((int)arg, 5, 20);
        prefs.putInt("outThr", outwardThreshold);
        Serial.printf("[CTRL] outward threshold = %d\n", outwardThreshold);
        break;
      case 0x06:
        mountFlags = arg & (MOUNT_INVERT | MOUNT_SWAP_AXES);
        prefs.putUChar("mount", mountFlags);
        Serial.printf("[CTRL] mount invert=%d swap=%d\n", mountFlags & MOUNT_INVERT ? 1 : 0,
                      mountFlags & MOUNT_SWAP_AXES ? 1 : 0);
        break;
      default:
        Serial.printf("[CTRL] unknown op 0x%02X\n", op);
    }
  }
};

void setupBle() {
  BLEDevice::init(DEVICE_NAME);

#if BLE_REQUIRE_PIN
  // [S8] Static passkey + MITM + bonding: the phone asks for BLE_PIN once and
  // remembers the bond. ESP_IO_CAP_OUT ("display only") is required for the
  // passkey method even though the PIN is fixed.
  BLESecurity *security = new BLESecurity();
  security->setPassKey(true, BLE_PIN);
  security->setCapability(ESP_IO_CAP_OUT);
  security->setAuthenticationMode(true, true, true);
#endif

  server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);

  sensorChar = service->createCharacteristic(
      SENSOR_CHAR_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
#if !defined(CONFIG_NIMBLE_ENABLED)
  sensorChar->addDescriptor(new BLE2902());
#endif

#if BLE_REQUIRE_PIN
  controlChar = service->createCharacteristic(
      CONTROL_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_AUTHEN);
  controlChar->setAccessPermissions(ESP_GATT_PERM_WRITE_ENC_MITM);
#else
  controlChar = service->createCharacteristic(
      CONTROL_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
#endif
  controlChar->setCallbacks(new ControlCallbacks());

  service->start();

  BLEAdvertisementData advert;
  advert.setFlags(0x06);
  advert.setCompleteServices(BLEUUID(SERVICE_UUID));
  BLEAdvertisementData scanResponse;
  scanResponse.setName(DEVICE_NAME);

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->setAdvertisementData(advert);
  advertising->setScanResponseData(scanResponse);
  advertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] advertising as " DEVICE_NAME);
#if BLE_REQUIRE_PIN
  Serial.printf("[BLE] control channel needs pairing, PIN %06d\n", BLE_PIN);
#endif
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\n=== Ashi sensor v" FW_VERSION " ===");

  pinMode(VIB_PIN, OUTPUT);
  digitalWrite(VIB_PIN, LOW);

  prefs.begin("ashi", false);
  inwardThreshold = prefs.getInt("threshold", DEFAULT_INWARD_THRESHOLD);
  outwardThreshold = prefs.getInt("outThr", DEFAULT_OUTWARD_THRESHOLD);
  vibrationEnabled = prefs.getBool("vibration", true);
  offsetRoll = prefs.getFloat("offR", prefs.getFloat("rollOffset", 0));
  offsetPitch = prefs.getFloat("offP", 0);
  mountFlags = prefs.getUChar("mount", 0);
  Serial.printf("[CFG] in=%d out=%d vibration=%d offsets=%.2f/%.2f mount=0x%02X\n",
                inwardThreshold, outwardThreshold, vibrationEnabled, offsetRoll, offsetPitch,
                mountFlags);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  mpu.initialize();  // [S2]
  imuOk = mpu.testConnection();
  if (imuOk) {
    mpu.setDLPFMode(MPU6050_DLPF_BW_42);
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_1000);
    delay(50);
    float ax0, ay0, az0;
    calibrateAtRest(ax0, ay0, az0);
    fAx = ax0;
    fAy = ay0;
    fAz = az0;
    warmUpFilter(ax0, ay0, az0);
  } else {
    Serial.println("[IMU] MPU6050 NOT FOUND: check wiring (SDA 18, SCL 17, 3V3, GND)");
  }

  setupBle();
  lastSampleUs = micros();
}

void loop() {
  unsigned long nowUs = micros();
  unsigned long nowMs = millis();

  if (restartAdvertising) {
    restartAdvertising = false;
    delay(200);
    BLEDevice::startAdvertising();
    Serial.println("[BLE] advertising again");
  }

  if (testBuzzRequested) {
    testBuzzRequested = false;
    testBuzzUntil = nowMs + 350;
  }

  if (imuOk && nowUs - lastSampleUs >= 1000000UL / SAMPLE_RATE_HZ) {
    updateImu(nowUs, nowMs);
  }

  updateVibration(nowMs);

  if (nowMs - lastBatteryMs >= 1000 || lastBatteryMs == 0) {
    lastBatteryMs = nowMs;
    batteryPercent = readBattery();
  }

  if (nowMs - lastNotifyMs >= 1000UL / NOTIFY_RATE_HZ) {
    lastNotifyMs = nowMs;
    pushWindow(tilt);
    if (deviceConnected && imuOk) {
      sendPacket();
    }
  }

  if (nowMs - lastSerialMs >= 1000UL / SERIAL_RATE_HZ) {
    lastSerialMs = nowMs;
    unsigned gatedPct = totalSamples ? gatedSamples * 100 / totalSamples : 0;
    Serial.printf("tilt:%.2f pitch:%.2f in:%d out:%d acc:%.2f strikes:%u gated:%u connected:%d\n",
                  tilt, pitch, inwardThreshold, -outwardThreshold, accPeakSinceSerial,
                  strikeCount, gatedPct, deviceConnected ? 1 : 0);
    accPeakSinceSerial = 0;
    gatedSamples = 0;
    totalSamples = 0;
  }
}
