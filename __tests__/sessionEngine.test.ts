import {afterAll, beforeEach, describe, expect, it} from '@jest/globals';
import {
  computeBalance,
  computeStability,
  downsample,
  sessionEngine,
  strikeDelta,
} from '../src/session/sessionEngine';
import {useHistoryStore} from '../src/store/historyStore';
import {useLiveStore} from '../src/store/liveStore';
import {useSessionStore} from '../src/store/sessionStore';
import {useSettingsStore} from '../src/store/settingsStore';

const packet = (roll: number, strikes: number | null = null) => ({
  roll,
  pitch: 0,
  stability: 0,
  inwardPercent: 0,
  battery: 80,
  strikes,
});

const feed = (rolls: number[], start: number) => {
  let now = start;
  for (const roll of rolls) {
    sessionEngine.ingest(packet(roll), 'demo', now);
    now += 50;
  }
  return now;
};

describe('sessionEngine', () => {
  beforeEach(() => {
    useSettingsStore.setState({inwardThreshold: 8, outwardThreshold: 10});
    useHistoryStore.setState({sessions: []});
    sessionEngine.discard();
    sessionEngine.resetLive();
  });

  afterAll(() => sessionEngine.dispose());

  it('computes stability and balance', () => {
    expect(computeStability([0, 0, 0, 0, 0])).toBe(100);
    expect(computeStability([-5, 5, -5, 5, -5, 5])).toBe(50);
    expect(computeBalance(100, 0)).toBe(100);
    expect(computeBalance(50, 50)).toBe(50);
  });

  it('downsamples long traces', () => {
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(
      downsample(
        Array.from({length: 120}, (_, i) => i),
        60,
      ),
    ).toHaveLength(60);
  });

  it('does not accumulate session metrics while idle', () => {
    feed([10, 10, 0, 0], 1000);
    sessionEngine.publish();
    expect(useLiveStore.getState().motorActivations).toBe(0);
    expect(useLiveStore.getState().angle).toBe(0);
  });

  it('counts activations, corrections and inward share during a session', () => {
    let now = feed([0], 1000);
    sessionEngine.start(now);
    now = feed(
      [...Array(10).fill(1), ...Array(4).fill(10), ...Array(6).fill(1)],
      now,
    );
    sessionEngine.publish();

    const live = useLiveStore.getState();
    expect(live.motorActivations).toBe(1);
    expect(live.inwardPercent).toBe(20);
    expect(live.avgCorrectionMs).toBe(200);
    expect(live.peakAngle).toBe(10);

    const record = sessionEngine.stop(now);
    expect(record).not.toBeNull();
    expect(record!.motorActivations).toBe(1);
    expect(record!.durationMs).toBe(1000);
    expect(record!.source).toBe('demo');
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useSessionStore.getState().status).toBe('idle');
  });

  it('ignores jitter around the threshold (hysteresis)', () => {
    let now = feed([0], 1000);
    sessionEngine.start(now);
    now = feed([8.2, 7.9, 8.3, 7.8, 8.1, 2, 2], now);
    sessionEngine.publish();
    expect(useLiveStore.getState().motorActivations).toBe(1);
    sessionEngine.stop(now);
  });

  it('excludes paused time from the duration and data', () => {
    let now = feed([0], 0);
    sessionEngine.start(now);
    now = feed(Array(20).fill(1), now);
    sessionEngine.pause(now);
    now = feed(Array(40).fill(12), now);
    sessionEngine.resume(now);
    now = feed(Array(20).fill(1), now);
    const record = sessionEngine.stop(now);
    expect(record!.durationMs).toBe(2000);
    expect(record!.inwardPercent).toBe(0);
    expect(record!.motorActivations).toBe(0);
  });

  it('does not save empty sessions', () => {
    sessionEngine.start(0);
    expect(sessionEngine.stop(5000)).toBeNull();
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
  });

  it('counts outward events separately from inward ones', () => {
    let now = feed([0, 0, 0], 1000);
    sessionEngine.start(now);
    now = feed([0, 9, 9, 0, -11, -11, -5, -12, -3], now);
    const record = sessionEngine.stop(now);
    expect(record?.motorActivations).toBe(1);
    expect(record?.outwardEvents).toBe(2);
    expect(record?.outwardThreshold).toBe(10);
  });

  it('turns foot strikes into session steps, ignoring pauses', () => {
    let now = 1000;
    sessionEngine.ingest(packet(0, 100), 'ble', now);
    sessionEngine.start(now);
    for (let s = 101; s <= 110; s++) {
      sessionEngine.ingest(packet(0, s), 'ble', (now += 1000));
    }
    sessionEngine.pause(now);
    sessionEngine.ingest(packet(0, 115), 'ble', (now += 1000));
    sessionEngine.resume(now);
    sessionEngine.ingest(packet(0, 116), 'ble', (now += 1000));
    sessionEngine.publish();
    expect(useLiveStore.getState().steps).toBe(22);
    expect(useLiveStore.getState().stepsSupported).toBe(true);
    const record = sessionEngine.stop(now);
    expect(record?.steps).toBe(22);
  });

  it('reports live cadence once enough data is in', () => {
    let now = 1000;
    let strikes = 0;
    for (let i = 0; i <= 10; i++) {
      sessionEngine.ingest(packet(0, strikes++), 'ble', now);
      now += 1200;
    }
    sessionEngine.publish();
    const cadence = useLiveStore.getState().cadence;
    expect(cadence).toBeGreaterThanOrEqual(90);
    expect(cadence).toBeLessThanOrEqual(110);
  });

  it('has no steps for firmware without a strike counter', () => {
    const now = feed([1, 2, 3], 1000);
    sessionEngine.start(now);
    const record = sessionEngine.stop(feed([1, 2, 3], now));
    expect(record?.steps).toBeNull();
    expect(useLiveStore.getState().stepsSupported).toBe(false);
  });

  it('handles counter wrap-around and device resets', () => {
    expect(strikeDelta(null, 5)).toBe(0);
    expect(strikeDelta(65534, 1)).toBe(3);
    expect(strikeDelta(500, 2)).toBe(0);
    expect(strikeDelta(7, 7)).toBe(0);
  });
});
