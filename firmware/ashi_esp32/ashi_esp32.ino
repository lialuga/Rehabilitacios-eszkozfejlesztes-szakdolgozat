/*
 * [S1] Arduino "BlinkWithoutDelay" example (public domain)
 *      https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/
 * [S2] Electronic Cats MPU6050 library 1.4.4 (MIT)
 *      https://github.com/ElectronicCats/mpu6050
 * [S3] Arduino MadgwickAHRS library 1.2.0 (GPL)
 *      https://github.com/arduino-libraries/MadgwickAHRS
 *      S. O. H. Madgwick, "An efficient orientation filter for inertial and
 *      inertial/magnetic sensor arrays", 2010.
 * [S4] Arduino Wire library, "master_reader" example (public domain)
 *      https://docs.arduino.cc/learn/communication/wire/
 * [S5] x-io Technologies Fusion, acceleration rejection (MIT, idea only)
 *      https://github.com/xioTechnologies/Fusion
 * [S6] Espressif Arduino-ESP32 BLE examples "Server", "Notify" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE/examples
 * [S7] Espressif Arduino-ESP32 Preferences example "StartCounter" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/Preferences/examples
 * [S8] Espressif Arduino-ESP32 BLE example "Server_secure_static_passkey" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE/examples
 */

#include <Wire.h>           // [S4]
#include <MPU6050.h>        // [S2]
#include <MadgwickAHRS.h>   // [S3]
#include <Preferences.h>    // [S7]

#include <BLEDevice.h>      // [S6]
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLESecurity.h>  // [S8]
#if !defined(CONFIG_NIMBLE_ENABLED)
#include <BLE2902.h>
#endif

#define DEVICE_NAME "Ashi-Sensor"
#define FW_VERSION "2.1"

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
#define LEGACY_LPF_ALPHA 0.15f

// [S5]
#define ACC_GATE_MIN_G 0.85f
#define ACC_GATE_MAX_G 1.15f

#define STEP_HIGH_G 1.3f
#define STEP_LOW_G 1.1f
#define STEP_MIN_INTERVAL_MS 250

#define VIB_ARM_MS 150
#define IMU_BAD_READS_LIMIT 5
#define FILTER_RESET_DEG 20.0f
#define FILTER_RESET_MS 300
#define HOST_GONE_MS 5000
#define FILTER_RESET_MAX_DPS 20.0f
#define IMU_RECOVERY_INTERVAL_MS 500
#define VIB_HYSTERESIS_DEG 0.5f

#define DEFAULT_INWARD_THRESHOLD 8
#define DEFAULT_OUTWARD_THRESHOLD 10

#define MOUNT_INVERT 0x01
#define MOUNT_SWAP_AXES 0x02

#define SERVICE_UUID         "12345678-1234-5678-1234-56789abcdef0"
#define SENSOR_CHAR_UUID     "abcdef01-1234-5678-1234-56789abcdef0"
#define CONTROL_CHAR_UUID    "abcdef02-1234-5678-1234-56789abcdef0"

enum TiltSide { SIDE_NONE, SIDE_INWARD, SIDE_OUTWARD };

MPU6050 mpuLow(0x68);
MPU6050 mpuHigh(0x69);
MPU6050 *imu = &mpuLow;
Madgwick filter;
Madgwick legacyFilter;
Preferences prefs;

BLEServer *server = nullptr;
BLECharacteristic *sensorChar = nullptr;
BLECharacteristic *controlChar = nullptr;

volatile bool deviceConnected = false;
volatile bool restartAdvertising = false;
volatile bool calibrateRequested = false;
volatile bool testBuzzRequested = false;
volatile uint32_t connectEvents = 0, disconnectEvents = 0;
uint32_t seenConnects = 0, seenDisconnects = 0;

bool imuOk = false;
uint8_t imuAddress = 0;
int imuWhoAmI = -1;
bool imuLost = false;
uint16_t imuBadReads = 0;
unsigned long imuLastRecoveryMs = 0;
uint32_t imuRecoveries = 0;
unsigned long divergentSince = 0;
uint32_t filterResets = 0;
unsigned long lastHostMs = 0;

float gyroBiasX = 0, gyroBiasY = 0, gyroBiasZ = 0;
float fAx = 0, fAy = 0, fAz = 1;
float lGx = 0, lGy = 0, lGz = 0, lAx = 0, lAy = 0, lAz = 1;

float offsetRoll = 0, offsetPitch = 0;
uint8_t mountFlags = 0;

float tilt = 0;
float legacyTilt = 0;
float accTilt = 0;
float lastAccMag = 1;
bool lastGated = false;
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

uint16_t packetSeq = 0;
uint32_t packetsThisConnection = 0;
bool logMode = false;
bool motorTest = false;
bool motorOn = false;
TiltSide alertSide = SIDE_NONE;
String serialLine;

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
    imu->getMotion6(&ax, &ay, &az, &rx, &ry, &rz);  // [S2]
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

// [S3]
void warmUp(Madgwick &f, float ax0, float ay0, float az0) {
  f.begin(10.0f);
  for (int i = 0; i < 200; i++) f.updateIMU(0, 0, 0, ax0, ay0, az0);
  f.begin(SAMPLE_RATE_HZ);
  for (int i = 0; i < 200; i++) f.updateIMU(0, 0, 0, ax0, ay0, az0);
}

void warmUpFilter(float ax0, float ay0, float az0) {
  warmUp(filter, ax0, ay0, az0);
  warmUp(legacyFilter, ax0, ay0, az0);
  lAx = ax0;
  lAy = ay0;
  lAz = az0;
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
  uint8_t packet[16];
  putInt16(packet, tilt);
  putInt16(packet + 2, pitch);
  uint16_t stability = windowStability();
  packet[4] = stability >> 8;
  packet[5] = stability & 0xFF;
  packet[6] = windowInwardPercent();
  packet[7] = batteryPercent;
  packet[8] = strikeCount >> 8;
  packet[9] = strikeCount & 0xFF;
  packet[10] = packetSeq >> 8;
  packet[11] = packetSeq & 0xFF;
  uint32_t sensorMs = millis();
  packet[12] = sensorMs >> 24;
  packet[13] = (sensorMs >> 16) & 0xFF;
  packet[14] = (sensorMs >> 8) & 0xFF;
  packet[15] = sensorMs & 0xFF;
  sensorChar->setValue(packet, sizeof(packet));
  sensorChar->notify();
  packetSeq++;
  packetsThisConnection++;
}

float mapTilt(float roll, float pitchDeg) {
  float r = (mountFlags & MOUNT_SWAP_AXES) ? pitchDeg - offsetPitch : roll - offsetRoll;
  return (mountFlags & MOUNT_INVERT) ? -r : r;
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

  int16_t rax = 0, ray = 0, raz = 0, rgx = 0, rgy = 0, rgz = 0;
  imu->getMotion6(&rax, &ray, &raz, &rgx, &rgy, &rgz);  // [S2]
  if (rax == 0 && ray == 0 && raz == 0) {
    if (imuBadReads < 1000) imuBadReads++;
    if (imuBadReads >= IMU_BAD_READS_LIMIT) {
      if (!imuLost) {
        imuLost = true;
        lastAccMag = 0;
        if (logMode) Serial.printf("E,%lu,imu,lost\n", nowMs);
        else Serial.println("[IMU] no data, reinitialising");
      }
      recoverImu(nowMs);
    }
    return;
  }
  imuBadReads = 0;
  if (imuLost) {
    imuLost = false;
    if (logMode) Serial.printf("E,%lu,imu,recovered,%lu\n", nowMs, (unsigned long)imuRecoveries);
    else Serial.println("[IMU] data again");
  }

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

  filter.begin(1.0f / dt);  // [S3]
  if (accTrusted) {
    filter.updateIMU(gx, gy, gz, fAx, fAy, fAz);
  } else {
    filter.updateIMU(gx, gy, gz, 0, 0, 0);  // [S3] [S5]
  }

  float rawRoll = filter.getRoll();
  float rawPitch = filter.getPitch();

  float gyroNorm = sqrtf(gx * gx + gy * gy + gz * gz);
  float fMag = sqrtf(fAx * fAx + fAy * fAy + fAz * fAz);
  if (accTrusted && gyroNorm < FILTER_RESET_MAX_DPS && fMag > 0.05f) {
    float accRoll = atan2f(fAy, fAz) * RAD_TO_DEG;
    float accPitch = asinf(constrain(-fAx / fMag, -1.0f, 1.0f)) * RAD_TO_DEG;
    float dRoll = fabsf(remainderf(rawRoll - accRoll, 360.0f));
    float dPitch = fabsf(rawPitch - accPitch);
    bool off = dPitch > FILTER_RESET_DEG || (fabsf(accPitch) < 60.0f && dRoll > FILTER_RESET_DEG);
    if (!off) {
      divergentSince = 0;
    } else if (divergentSince == 0) {
      divergentSince = nowMs | 1;
    } else if (nowMs - divergentSince >= FILTER_RESET_MS) {
      divergentSince = 0;
      filterResets++;
      filter = Madgwick();
      warmUp(filter, fAx, fAy, fAz);
      if (logMode) Serial.printf("E,%lu,filter,reset,%.1f,%.1f\n", nowMs, rawRoll, rawPitch);
      else Serial.printf("[IMU] filter diverged (roll %.1f pitch %.1f), reset\n", rawRoll, rawPitch);
      rawRoll = filter.getRoll();
      rawPitch = filter.getPitch();
    }
  } else {
    divergentSince = 0;
  }

  lGx = lowPass(gx, lGx, LEGACY_LPF_ALPHA);
  lGy = lowPass(gy, lGy, LEGACY_LPF_ALPHA);
  lGz = lowPass(gz, lGz, LEGACY_LPF_ALPHA);
  lAx = lowPass(ax, lAx, LEGACY_LPF_ALPHA);
  lAy = lowPass(ay, lAy, LEGACY_LPF_ALPHA);
  lAz = lowPass(az, lAz, LEGACY_LPF_ALPHA);
  legacyFilter.updateIMU(lGx, lGy, lGz, lAx, lAy, lAz);

  lastAccMag = accMag;
  lastGated = !accTrusted;

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

  legacyTilt = mapTilt(legacyFilter.getRoll(), legacyFilter.getPitch());
  if (accMag > 0.05f) {
    float accRoll = atan2f(ay, az) * RAD_TO_DEG;
    float accPitch = asinf(constrain(-ax / accMag, -1.0f, 1.0f)) * RAD_TO_DEG;
    accTilt = mapTilt(accRoll, accPitch);
  }
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

void setMotor(bool on) {
  motorOn = on;
  digitalWrite(VIB_PIN, on ? HIGH : LOW);
}

void updateVibration(unsigned long nowMs) {
  if (motorTest || nowMs < testBuzzUntil) {
    setMotor(true);
    return;
  }

  TiltSide &side = alertSide;
  static TiltSide pending = SIDE_NONE;
  static unsigned long pendingSince = 0, alertSince = 0;

  TiltSide raw = (vibrationEnabled && imuOk && !imuLost) ? rawSide(pending) : SIDE_NONE;
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
    setMotor(false);
    return;
  }
  float excess = side == SIDE_INWARD ? tilt - inwardThreshold : -tilt - outwardThreshold;
  setMotor(patternOn(side, excess, nowMs - alertSince));
}

void runSerialCommand(const String &cmd) {
  if (cmd == "L1") {
    logMode = true;
    Serial.printf("E,%lu,config,%d,%d,%d,%d,%.1f,%d,0x%02X,%d\n", millis(), inwardThreshold,
                  outwardThreshold, vibrationEnabled ? 1 : 0, VIB_ARM_MS, VIB_HYSTERESIS_DEG, imuOk ? 1 : 0,
                  imuAddress, imuWhoAmI);
  } else if (cmd == "L0") {
    logMode = false;
  } else if (cmd == "M1") {
    motorTest = true;
  } else if (cmd == "M0") {
    motorTest = false;
  } else if (cmd == "V1") {
    vibrationEnabled = true;
  } else if (cmd == "V0") {
    vibrationEnabled = false;
  } else if (cmd == "C") {
    calibrateRequested = true;
  } else {
    Serial.printf("E,%lu,unknown,%s\n", millis(), cmd.c_str());
    return;
  }
  Serial.printf("E,%lu,cmd,%s\n", millis(), cmd.c_str());
}

void handleSerialInput() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialLine.length() > 0) runSerialCommand(serialLine);
      serialLine = "";
    } else if (serialLine.length() < 16) {
      serialLine += c;
    }
  }
}

void reportBleEvents(unsigned long nowMs) {
  if (connectEvents != seenConnects) {
    seenConnects = connectEvents;
    packetsThisConnection = 0;
    if (logMode) Serial.printf("E,%lu,connect\n", nowMs);
    else Serial.println("[BLE] phone connected");
  }
  if (disconnectEvents != seenDisconnects) {
    seenDisconnects = disconnectEvents;
    if (logMode) Serial.printf("E,%lu,disconnect,%lu\n", nowMs, (unsigned long)packetsThisConnection);
    else Serial.printf("[BLE] phone disconnected after %lu packets\n", (unsigned long)packetsThisConnection);
  }
}

// [S6]

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    deviceConnected = true;
    connectEvents++;
  }
  void onDisconnect(BLEServer *) override {
    deviceConnected = false;
    restartAdvertising = true;
    disconnectEvents++;
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
  // [S8]
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

// [S4]
int readWhoAmI(uint8_t address) {
  Wire.beginTransmission(address);
  Wire.write(0x75);
  if (Wire.endTransmission(false) != 0) return -1;
  if (Wire.requestFrom(address, (uint8_t)1) != 1) return -1;
  return Wire.read();
}

void configureImu() {
  imu->setDLPFMode(MPU6050_DLPF_BW_42);
  imu->setFullScaleAccelRange(MPU6050_ACCEL_FS_8);
  imu->setFullScaleGyroRange(MPU6050_GYRO_FS_1000);
}

void recoverImu(unsigned long nowMs) {
  if (nowMs - imuLastRecoveryMs < IMU_RECOVERY_INTERVAL_MS) return;
  imuLastRecoveryMs = nowMs;
  imuRecoveries++;
  if (readWhoAmI(imuAddress) < 0) {
    Wire.end();
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(400000);
    if (readWhoAmI(imuAddress) < 0) return;
  }
  imu->initialize();  // [S2]
  configureImu();
}

bool findImu() {
  const uint8_t addresses[] = {0x68, 0x69};
  for (uint8_t address : addresses) {
    int who = readWhoAmI(address);
    if (who < 0) continue;
    imu = address == 0x68 ? &mpuLow : &mpuHigh;
    imu->initialize();  // [S2]
    imuAddress = address;
    imuWhoAmI = who;
    Serial.printf("[IMU] found at 0x%02X, WHO_AM_I 0x%02X%s\n", address, who,
                  imu->testConnection() ? "" : " (not a genuine MPU6050 ID, using it anyway)");
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\n=== Ashi sensor v" FW_VERSION " ===");

  pinMode(VIB_PIN, OUTPUT);
  digitalWrite(VIB_PIN, LOW);

  prefs.begin("ashi", false);  // [S7]
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
  imuOk = findImu();
  if (imuOk) {
    configureImu();
    delay(50);
    float ax0, ay0, az0;
    calibrateAtRest(ax0, ay0, az0);
    fAx = ax0;
    fAy = ay0;
    fAz = az0;
    warmUpFilter(ax0, ay0, az0);
  } else {
    Serial.println("[IMU] MPU6050 NOT FOUND at 0x68/0x69: check wiring (SDA 18, SCL 17, 3V3, GND)");
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

  handleSerialInput();
  if (Serial) {
    lastHostMs = nowMs;
  } else if ((logMode || motorTest) && nowMs - lastHostMs >= HOST_GONE_MS) {
    logMode = false;
    motorTest = false;
  }
  reportBleEvents(nowMs);

  bool sampled = false;
  if (imuOk && nowUs - lastSampleUs >= 1000000UL / SAMPLE_RATE_HZ) {
    updateImu(nowUs, nowMs);
    sampled = true;
  }

  updateVibration(nowMs);

  if (logMode && sampled) {
    Serial.printf("D,%lu,%.2f,%.2f,%.2f,%.3f,%d,%d,%d,%d,%u\n", nowMs, tilt, legacyTilt, accTilt,
                  lastAccMag, lastGated ? 1 : 0, (int)alertSide, motorOn ? 1 : 0,
                  deviceConnected ? 1 : 0, (unsigned)packetSeq);
  }

  if (nowMs - lastBatteryMs >= 1000 || lastBatteryMs == 0) {  // [S1]
    lastBatteryMs = nowMs;
    batteryPercent = readBattery();
  }

  if (nowMs - lastNotifyMs >= 1000UL / NOTIFY_RATE_HZ) {
    lastNotifyMs = nowMs;
    pushWindow(tilt);
    if (deviceConnected && imuOk && !imuLost) {
      sendPacket();
    }
  }

  if (!logMode && nowMs - lastSerialMs >= 1000UL / SERIAL_RATE_HZ) {
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
