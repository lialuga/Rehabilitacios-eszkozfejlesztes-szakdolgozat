import {describe, expect, it} from '@jest/globals';
import {
  ControlCommand,
  decodeBase64,
  encodeBase64,
  encodePacket,
  matchesSensorDevice,
  parsePacket,
} from '../src/ble/protocol';

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

describe('sensor protocol', () => {
  it('round-trips a packet with negative angles', () => {
    const packet = {
      roll: -12.34,
      pitch: 3.5,
      stability: 87,
      inwardPercent: 21,
      battery: 64,
      strikes: null,
    };
    const decoded = parsePacket(decodeBase64(toBase64(encodePacket(packet))));
    expect(decoded).toEqual(packet);
  });

  it('decodes bytes above 0x7F without corruption', () => {
    const bytes = Uint8Array.from([
      0xff, 0x9c, 0x80, 0x00, 0x00, 0x64, 0xff, 0x64,
    ]);
    expect(Array.from(decodeBase64(toBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
  });

  it('interprets roll as signed int16', () => {
    const packet = parsePacket(
      Uint8Array.from([0xff, 0x9c, 0, 0, 0, 50, 0, 80]),
    );
    expect(packet?.roll).toBe(-1);
  });

  it('rejects short or implausible packets', () => {
    expect(parsePacket(Uint8Array.from([1, 2, 3]))).toBeNull();
    expect(
      parsePacket(Uint8Array.from([0x7f, 0xff, 0, 0, 0, 0, 0, 0])),
    ).toBeNull();
  });

  it('clamps percentages', () => {
    const packet = parsePacket(
      Uint8Array.from([0, 0, 0, 0, 0x01, 0x00, 200, 200]),
    );
    expect(packet).toMatchObject({
      stability: 100,
      inwardPercent: 100,
      battery: 100,
    });
  });

  it('matches the sensor by service UUID or name', () => {
    expect(
      matchesSensorDevice({
        serviceUUIDs: ['12345678-1234-5678-1234-56789ABCDEF0'],
      }),
    ).toBe(true);
    expect(matchesSensorDevice({name: 'StepAlign-01'})).toBe(true);
    expect(matchesSensorDevice({localName: 'Ashi Sensor'})).toBe(true);
    expect(matchesSensorDevice({name: 'JBL Flip'})).toBe(false);
  });

  it('treats battery 255 as unknown', () => {
    const packet = parsePacket(Uint8Array.from([0, 0, 0, 0, 0, 90, 0, 255]));
    expect(packet?.battery).toBeNull();
  });

  it('round-trips the v2 packet with the strike counter', () => {
    const packet = {
      roll: 4.2,
      pitch: -20,
      stability: 70,
      inwardPercent: 5,
      battery: null,
      strikes: 65535,
    };
    const bytes = encodePacket(packet);
    expect(bytes.length).toBe(10);
    expect(parsePacket(bytes)).toEqual(packet);
  });

  it('reads v1 (8-byte) packets without steps', () => {
    const packet = parsePacket(Uint8Array.from([0, 100, 0, 0, 0, 90, 0, 255]));
    expect(packet?.strikes).toBeNull();
  });

  it('encodes the v2 control commands', () => {
    expect(Array.from(ControlCommand.setOutwardThreshold(12))).toEqual([5, 12]);
    expect(
      Array.from(ControlCommand.setMount({invertTilt: true, swapAxes: false})),
    ).toEqual([6, 1]);
    expect(
      Array.from(ControlCommand.setMount({invertTilt: true, swapAxes: true})),
    ).toEqual([6, 3]);
  });

  it('encodes base64 like Node for control commands', () => {
    for (const bytes of [
      ControlCommand.setThreshold(8),
      ControlCommand.calibrate(),
      ControlCommand.setVibration(true),
      Uint8Array.from([0xff, 0x00, 0x80, 0x7f, 0x01]),
    ]) {
      expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
    expect(Array.from(ControlCommand.setThreshold(8))).toEqual([1, 8]);
  });
});
