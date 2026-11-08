/* eslint-disable no-bitwise -- binary packet decoding */

export const SENSOR_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
export const SENSOR_CHARACTERISTIC_UUID =
  'abcdef01-1234-5678-1234-56789abcdef0';
export const CONTROL_CHARACTERISTIC_UUID =
  'abcdef02-1234-5678-1234-56789abcdef0';
export const BATTERY_UNKNOWN = 255;
export const DEVICE_NAME_PREFIXES = ['StepAlign', 'Ashi'];
export const PACKET_LENGTH = 8;
export const PACKET_LENGTH_WITH_STEPS = 10;

const MAX_ABS_ROLL = 90;

export interface SensorPacket {
  roll: number;
  pitch: number;
  stability: number;
  inwardPercent: number;
  battery: number | null;
  strikes: number | null;
}

export interface MountConfig {
  invertTilt: boolean;
  swapAxes: boolean;
}

const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) {
    table[B64_ALPHABET.charCodeAt(i)] = i;
  }
  table['-'.charCodeAt(0)] = 62;
  table['_'.charCodeAt(0)] = 63;
  return table;
})();

export function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/\-_]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < clean.length; i++) {
    const value = B64_LOOKUP[clean.charCodeAt(i)];
    if (value < 0) {
      continue;
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }

  return out.subarray(0, index);
}

export function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64_ALPHABET[(triple >> 18) & 63];
    out += B64_ALPHABET[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? B64_ALPHABET[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[triple & 63] : '=';
  }
  return out;
}

export const ControlCommand = {
  setThreshold: (degrees: number) =>
    Uint8Array.from([0x01, Math.max(0, Math.min(90, Math.round(degrees)))]),
  calibrate: () => Uint8Array.from([0x02]),
  setVibration: (enabled: boolean) => Uint8Array.from([0x03, enabled ? 1 : 0]),
  testVibration: () => Uint8Array.from([0x04]),
  setOutwardThreshold: (degrees: number) =>
    Uint8Array.from([0x05, Math.max(0, Math.min(90, Math.round(degrees)))]),
  setMount: ({invertTilt, swapAxes}: MountConfig) =>
    Uint8Array.from([0x06, (invertTilt ? 1 : 0) | (swapAxes ? 2 : 0)]),
};

const int16 = (hi: number, lo: number) => (((hi << 8) | lo) << 16) >> 16;
const uint16 = (hi: number, lo: number) => (hi << 8) | lo;
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function parsePacket(bytes: Uint8Array): SensorPacket | null {
  if (bytes.length < PACKET_LENGTH) {
    return null;
  }

  const roll = int16(bytes[0], bytes[1]) / 100;
  const pitch = int16(bytes[2], bytes[3]) / 100;

  if (Math.abs(roll) > MAX_ABS_ROLL || Math.abs(pitch) > 180) {
    return null;
  }

  return {
    roll,
    pitch,
    stability: clampPercent(uint16(bytes[4], bytes[5])),
    inwardPercent: clampPercent(bytes[6]),
    battery: bytes[7] === BATTERY_UNKNOWN ? null : clampPercent(bytes[7]),
    strikes:
      bytes.length >= PACKET_LENGTH_WITH_STEPS
        ? uint16(bytes[8], bytes[9])
        : null,
  };
}

export function encodePacket(packet: SensorPacket): Uint8Array {
  const roll = Math.round(packet.roll * 100) & 0xffff;
  const pitch = Math.round(packet.pitch * 100) & 0xffff;
  const stability = Math.round(packet.stability) & 0xffff;
  const base = [
    roll >> 8,
    roll & 0xff,
    pitch >> 8,
    pitch & 0xff,
    stability >> 8,
    stability & 0xff,
    Math.round(packet.inwardPercent) & 0xff,
    packet.battery === null
      ? BATTERY_UNKNOWN
      : Math.round(packet.battery) & 0xff,
  ];
  if (packet.strikes !== null) {
    const strikes = Math.round(packet.strikes) & 0xffff;
    base.push(strikes >> 8, strikes & 0xff);
  }
  return Uint8Array.from(base);
}

export function matchesSensorDevice(device: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
}): boolean {
  const uuids = (device.serviceUUIDs ?? []).map(u => u.toLowerCase());
  if (uuids.includes(SENSOR_SERVICE_UUID)) {
    return true;
  }
  const names = [device.name, device.localName].filter(Boolean) as string[];
  return names.some(name =>
    DEVICE_NAME_PREFIXES.some(prefix => name.startsWith(prefix)),
  );
}
