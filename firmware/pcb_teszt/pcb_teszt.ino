/*
 * [P1] Espressif Arduino-ESP32 Preferences example "StartCounter" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/Preferences/examples
 * [P2] Espressif Arduino-ESP32 example "ResetReason" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/ESP32/examples
 * [P3] Espressif Arduino-ESP32 Wire example "WireScan" (LGPL-2.1)
 *      https://github.com/espressif/arduino-esp32/tree/master/libraries/Wire/examples
 * [P4] Arduino "BlinkWithoutDelay" example (public domain)
 *      https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/
 */

#include <Wire.h>
#include <Preferences.h>
#include <esp_system.h>

#define SDA_PIN 9
#define SCL_PIN 10
#define MOTOR_PIN 12
#define BMI270_ADDR 0x68
#define BMI270_CHIP_ID 0x24

Preferences prefs;
uint32_t bootCount = 0;
esp_reset_reason_t resetReason;
int chipId = -1;
int i2cDevices = 0;
unsigned long lastBeat = 0;
unsigned long motorUntil = 0;

// [P2]
const char *resetReasonName(esp_reset_reason_t r) {
  switch (r) {
    case ESP_RST_POWERON: return "poweron";
    case ESP_RST_EXT: return "ext";
    case ESP_RST_SW: return "sw";
    case ESP_RST_PANIC: return "panic";
    case ESP_RST_INT_WDT: return "int_wdt";
    case ESP_RST_TASK_WDT: return "task_wdt";
    case ESP_RST_WDT: return "wdt";
    case ESP_RST_DEEPSLEEP: return "deepsleep";
    case ESP_RST_BROWNOUT: return "brownout";
    case ESP_RST_SDIO: return "sdio";
    default: return "other";
  }
}

int readChipId() {
  Wire.beginTransmission(BMI270_ADDR);
  Wire.write(0x00);
  if (Wire.endTransmission(false) != 0) return -1;
  if (Wire.requestFrom(BMI270_ADDR, 1) != 1) return -1;
  return Wire.read();
}

// [P3]
int scanI2c() {
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) found++;
  }
  return found;
}

void setup() {
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW);
  Serial.begin(115200);
  resetReason = esp_reset_reason();
  prefs.begin("pcbteszt", false);  // [P1]
  bootCount = prefs.getUInt("boots", 0) + 1;
  prefs.putUInt("boots", bootCount);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  delay(20);
  i2cDevices = scanI2c();
  chipId = readChipId();
}

void loop() {
  unsigned long now = millis();
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == 'm') motorUntil = now + 300;
    if (c == 'r') {
      prefs.putUInt("boots", 0);
      bootCount = 0;
    }
    if (c == 'i') {
      i2cDevices = scanI2c();
      chipId = readChipId();
    }
  }
  digitalWrite(MOTOR_PIN, now < motorUntil ? HIGH : LOW);
  if (now - lastBeat >= 500) {  // [P4]
    lastBeat = now;
    Serial.printf("H,%lu,%lu,%s,%d,%d,%s\n", now, (unsigned long)bootCount, resetReasonName(resetReason),
                  i2cDevices, chipId, chipId == BMI270_CHIP_ID ? "BMI270" : "nincs");
  }
}
