/* eslint-disable no-bitwise -- binary packet decoding */
import base64 from 'react-native-base64';

export const SENSOR_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
export const SENSOR_CHARACTERISTIC_UUID =
  'abcdef01-1234-5678-1234-56789abcdef0';
export const CONTROL_CHARACTERISTIC_UUID =
  'abcdef02-1234-5678-1234-56789abcdef0';
export const BATTERY_UNKNOWN = 255;
export const DEVICE_NAME_PREFIXES = ['StepAlign', 'Ashi'];
export const PACKET_LENGTH = 8;
export const PACKET_LENGTH_WITH_STEPS = 10;
export const PACKET_LENGTH_WITH_SEQUENCE = 16;

const MAX_ABS_ROLL = 90;

export interface SensorPacket {
  roll: number;
  pitch: number;
  stability: number;
  inwardPercent: number;
  battery: number | null;
  strikes: number | null;
  seq?: number;
  sensorMs?: number;
}

export interface MountConfig {
  invertTilt: boolean;
  swapAxes: boolean;
}

export function decodeBase64(input: string): Uint8Array {
  let clean = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/]/g, '');
  if (clean.length === 0) {
    return new Uint8Array(0);
  }
  clean += '='.repeat((4 - (clean.length % 4)) % 4);
  const binary = base64.decode(clean);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

export function encodeBase64(bytes: Uint8Array): string {
  return base64.encodeFromByteArray(bytes);
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
const uint32 = (b: Uint8Array, i: number) =>
  ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
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

  const packet: SensorPacket = {
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
  if (bytes.length >= PACKET_LENGTH_WITH_SEQUENCE) {
    packet.seq = uint16(bytes[10], bytes[11]);
    packet.sensorMs = uint32(bytes, 12);
  }
  return packet;
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
    if (packet.seq !== undefined && packet.sensorMs !== undefined) {
      const seq = packet.seq & 0xffff;
      const ms = packet.sensorMs >>> 0;
      base.push(
        seq >> 8,
        seq & 0xff,
        ms >>> 24,
        (ms >>> 16) & 0xff,
        (ms >>> 8) & 0xff,
        ms & 0xff,
      );
    }
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
