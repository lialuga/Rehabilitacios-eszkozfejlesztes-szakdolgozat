import {SensorPacket} from '../ble/protocol';
import {useHistoryStore, SessionRecord} from '../store/historyStore';
import {DataSource, initialLiveMetrics, useLiveStore} from '../store/liveStore';
import {getElapsedMs, useSessionStore} from '../store/sessionStore';
import {useSettingsStore} from '../store/settingsStore';

const STABILITY_WINDOW_MS = 2500;
const SERIES_INTERVAL_MS = 100;
const SERIES_POINTS = 150;
const PUBLISH_INTERVAL_MS = 100;
const TRACE_BUCKET_MS = 1000;
const TRACE_POINTS = 60;
const THRESHOLD_HYSTERESIS = 0.5;
export const STEPS_PER_STRIKE = 2;
const CADENCE_WINDOW_MS = 10000;
const CADENCE_MIN_SPAN_MS = 4000;
const MAX_STRIKE_JUMP = 20;
const MIN_CADENCE_DURATION_MS = 20000;

export const strikeDelta = (previous: number | null, current: number) => {
  if (previous === null) {
    return 0;
  }
  const delta = (current - previous + 0x10000) % 0x10000;
  return delta > MAX_STRIKE_JUMP ? 0 : delta;
};

interface SessionAccumulator {
  frames: number;
  inwardFrames: number;
  stabilitySum: number;
  rollSum: number;
  peakAngle: number;
  motorActivations: number;
  outwardEvents: number;
  corrections: number[];
  aboveThreshold: boolean;
  aboveSince: number;
  beyondOutward: boolean;
  strikes: number;
  stepsSupported: boolean;
  trace: number[];
  bucketStart: number;
  bucketSum: number;
  bucketCount: number;
}

const emptyAccumulator = (): SessionAccumulator => ({
  frames: 0,
  inwardFrames: 0,
  stabilitySum: 0,
  rollSum: 0,
  peakAngle: 0,
  motorActivations: 0,
  outwardEvents: 0,
  corrections: [],
  aboveThreshold: false,
  aboveSince: 0,
  beyondOutward: false,
  strikes: 0,
  stepsSupported: false,
  trace: [],
  bucketStart: 0,
  bucketSum: 0,
  bucketCount: 0,
});

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export const computeStability = (rolls: number[]) => {
  if (rolls.length < 5) {
    return 100;
  }
  const avg = mean(rolls);
  const variance = mean(rolls.map(v => (v - avg) ** 2));
  return Math.round(Math.max(0, 100 - Math.sqrt(variance) * 10));
};

export const computeBalance = (stability: number, inwardPercent: number) =>
  Math.round(stability * 0.7 + (100 - inwardPercent) * 0.3);

export const downsample = (values: number[], points: number) => {
  if (values.length <= points) {
    return values.map(v => Math.round(v * 100) / 100);
  }
  const bucket = values.length / points;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const slice = values.slice(
      Math.floor(i * bucket),
      Math.floor((i + 1) * bucket),
    );
    out.push(Math.round(mean(slice) * 100) / 100);
  }
  return out;
};

const pushCapped = (series: number[], value: number, cap: number) => {
  series.push(value);
  if (series.length > cap) {
    series.splice(0, series.length - cap);
  }
};

class SessionEngine {
  private window: {t: number; roll: number; inward: boolean}[] = [];
  private rollSeries: number[] = [];
  private stabilitySeries: number[] = [];
  private inwardSeries: number[] = [];
  private lastSeriesAt = 0;

  private lastStrikes: number | null = null;
  private strikeTimes: number[] = [];
  private strikesSince = 0;

  private latest: SensorPacket | null = null;
  private source: DataSource | null = null;
  private lastPacketAt = 0;

  private acc = emptyAccumulator();
  private sessionSource: DataSource | null = null;

  private dirty = false;
  private publishTimer: ReturnType<typeof setInterval> | null = null;

  ingest(packet: SensorPacket, source: DataSource, now = Date.now()) {
    if (this.source !== source) {
      this.resetLive();
      this.source = source;
    }

    const {inwardThreshold: threshold, outwardThreshold} =
      useSettingsStore.getState();
    const roll = packet.roll;
    const running = useSessionStore.getState().status === 'running';
    const newStrikes = this.trackStrikes(packet.strikes, now);

    this.latest = packet;
    this.lastPacketAt = now;

    this.window.push({t: now, roll, inward: roll > threshold});
    while (this.window.length && now - this.window[0].t > STABILITY_WINDOW_MS) {
      this.window.shift();
    }

    const stability = computeStability(this.window.map(w => w.roll));

    if (running) {
      this.accumulate(roll, stability, threshold, outwardThreshold, now);
      this.acc.strikes += newStrikes;
      this.acc.stepsSupported ||= packet.strikes !== null;
    }

    if (now - this.lastSeriesAt >= SERIES_INTERVAL_MS) {
      this.lastSeriesAt = now;
      pushCapped(this.rollSeries, roll, SERIES_POINTS);
      pushCapped(this.stabilitySeries, stability, SERIES_POINTS);
      pushCapped(this.inwardSeries, this.windowInwardPercent(), SERIES_POINTS);
    }

    this.dirty = true;
    this.ensurePublisher();
  }

  private trackStrikes(strikes: number | null, now: number) {
    if (strikes === null) {
      this.lastStrikes = null;
      return 0;
    }
    if (this.lastStrikes === null) {
      this.strikesSince = now;
    }
    const delta = strikeDelta(this.lastStrikes, strikes);
    this.lastStrikes = strikes;
    for (let i = 0; i < delta; i++) {
      this.strikeTimes.push(now);
    }
    while (
      this.strikeTimes.length &&
      now - this.strikeTimes[0] > CADENCE_WINDOW_MS
    ) {
      this.strikeTimes.shift();
    }
    return delta;
  }

  private liveCadence(now: number) {
    if (this.lastStrikes === null) {
      return null;
    }
    const span = Math.min(CADENCE_WINDOW_MS, now - this.strikesSince);
    if (span < CADENCE_MIN_SPAN_MS) {
      return null;
    }
    const recent = this.strikeTimes.filter(t => now - t <= span).length;
    return Math.round(((recent * STEPS_PER_STRIKE) / span) * 60000);
  }

  private windowInwardPercent() {
    if (!this.window.length) {
      return 0;
    }
    return Math.round(
      (this.window.filter(w => w.inward).length / this.window.length) * 100,
    );
  }

  private accumulate(
    roll: number,
    stability: number,
    threshold: number,
    outwardThreshold: number,
    now: number,
  ) {
    const acc = this.acc;
    acc.frames++;
    acc.stabilitySum += stability;
    acc.rollSum += roll;
    if (Math.abs(roll) > Math.abs(acc.peakAngle)) {
      acc.peakAngle = roll;
    }

    if (roll > threshold) {
      acc.inwardFrames++;
      if (!acc.aboveThreshold) {
        acc.aboveThreshold = true;
        acc.aboveSince = now;
        acc.motorActivations++;
      }
    } else if (acc.aboveThreshold && roll < threshold - THRESHOLD_HYSTERESIS) {
      acc.aboveThreshold = false;
      acc.corrections.push(now - acc.aboveSince);
    }

    if (roll < -outwardThreshold) {
      if (!acc.beyondOutward) {
        acc.beyondOutward = true;
        acc.outwardEvents++;
      }
    } else if (
      acc.beyondOutward &&
      roll > -outwardThreshold + THRESHOLD_HYSTERESIS
    ) {
      acc.beyondOutward = false;
    }

    if (acc.bucketCount === 0) {
      acc.bucketStart = now;
    }
    acc.bucketSum += roll;
    acc.bucketCount++;
    if (now - acc.bucketStart >= TRACE_BUCKET_MS) {
      acc.trace.push(acc.bucketSum / acc.bucketCount);
      acc.bucketSum = 0;
      acc.bucketCount = 0;
    }
  }

  private sessionStats() {
    const acc = this.acc;
    if (!acc.frames) {
      return {
        avgStability: 0,
        inwardPercent: 0,
        balance: 0,
        avgCorrectionMs: 0,
      };
    }
    const avgStability = Math.round(acc.stabilitySum / acc.frames);
    const inwardPercent = Math.round((acc.inwardFrames / acc.frames) * 100);
    return {
      avgStability,
      inwardPercent,
      balance: computeBalance(avgStability, inwardPercent),
      avgCorrectionMs: Math.round(mean(acc.corrections)),
    };
  }

  start(now = Date.now()) {
    this.acc = emptyAccumulator();
    this.sessionSource = this.source;
    useSessionStore.setState({
      status: 'running',
      startedAt: now,
      accumulatedMs: 0,
      segmentStartedAt: now,
    });
    this.publish();
  }

  pause(now = Date.now()) {
    const session = useSessionStore.getState();
    if (session.status !== 'running') {
      return;
    }
    this.acc.aboveThreshold = false;
    this.acc.beyondOutward = false;
    useSessionStore.setState({
      status: 'paused',
      accumulatedMs: getElapsedMs(session, now),
      segmentStartedAt: null,
    });
    this.publish();
  }

  resume(now = Date.now()) {
    if (useSessionStore.getState().status !== 'paused') {
      return;
    }
    useSessionStore.setState({status: 'running', segmentStartedAt: now});
  }

  stop(now = Date.now()): SessionRecord | null {
    const session = useSessionStore.getState();
    if (session.status === 'idle' || session.startedAt === null) {
      return null;
    }

    const acc = this.acc;
    if (acc.bucketCount > 0) {
      acc.trace.push(acc.bucketSum / acc.bucketCount);
    }

    const stats = this.sessionStats();
    const durationMs = getElapsedMs(session, now);
    const steps = acc.stepsSupported ? acc.strikes * STEPS_PER_STRIKE : null;
    const settings = useSettingsStore.getState();
    const record: SessionRecord | null = acc.frames
      ? {
          id: `${session.startedAt}-${Math.random().toString(36).slice(2, 8)}`,
          startedAt: session.startedAt,
          durationMs,
          ...stats,
          motorActivations: acc.motorActivations,
          outwardEvents: acc.outwardEvents,
          peakAngle: Math.round(acc.peakAngle * 10) / 10,
          avgAngle: Math.round((acc.rollSum / acc.frames) * 10) / 10,
          threshold: settings.inwardThreshold,
          outwardThreshold: settings.outwardThreshold,
          steps,
          cadence:
            steps !== null && durationMs >= MIN_CADENCE_DURATION_MS
              ? Math.round(steps / (durationMs / 60000))
              : null,
          source: this.sessionSource ?? this.source ?? 'ble',
          trace: downsample(acc.trace, TRACE_POINTS),
        }
      : null;

    if (record) {
      useHistoryStore.getState().addSession(record);
    }

    this.discard();
    return record;
  }

  discard() {
    this.acc = emptyAccumulator();
    this.sessionSource = null;
    useSessionStore.setState({
      status: 'idle',
      startedAt: null,
      accumulatedMs: 0,
      segmentStartedAt: null,
    });
    this.publish();
  }

  resetLive() {
    this.window = [];
    this.rollSeries = [];
    this.stabilitySeries = [];
    this.inwardSeries = [];
    this.lastSeriesAt = 0;
    this.lastStrikes = null;
    this.strikeTimes = [];
    this.strikesSince = 0;
    this.latest = null;
    this.source = null;
    this.lastPacketAt = 0;
    useLiveStore.setState({...initialLiveMetrics});
  }

  private ensurePublisher() {
    if (this.publishTimer) {
      return;
    }
    this.publishTimer = setInterval(() => {
      if (this.dirty) {
        this.publish();
      }
    }, PUBLISH_INTERVAL_MS);
  }

  publish() {
    this.dirty = false;
    const sessionActive = useSessionStore.getState().status !== 'idle';
    const stats = this.sessionStats();
    const liveStability = computeStability(this.window.map(w => w.roll));
    const stepsSupported = this.lastStrikes !== null;

    useLiveStore.setState({
      angle: this.latest?.roll ?? 0,
      stability: liveStability,
      battery: this.latest ? this.latest.battery : null,
      source: this.source,
      lastPacketAt: this.lastPacketAt,
      inwardPercent: sessionActive ? stats.inwardPercent : 0,
      balance: sessionActive
        ? stats.balance
        : this.latest
        ? computeBalance(liveStability, this.windowInwardPercent())
        : 0,
      motorActivations: sessionActive ? this.acc.motorActivations : 0,
      outwardEvents: sessionActive ? this.acc.outwardEvents : 0,
      stepsSupported,
      steps:
        sessionActive && stepsSupported
          ? this.acc.strikes * STEPS_PER_STRIKE
          : null,
      cadence: this.liveCadence(this.lastPacketAt),
      avgCorrectionMs: sessionActive ? stats.avgCorrectionMs : 0,
      peakAngle: sessionActive ? Math.round(this.acc.peakAngle * 10) / 10 : 0,
      rollSeries: [...this.rollSeries],
      stabilitySeries: [...this.stabilitySeries],
      inwardSeries: [...this.inwardSeries],
    });
  }

  dispose() {
    if (this.publishTimer) {
      clearInterval(this.publishTimer);
      this.publishTimer = null;
    }
  }
}

export const sessionEngine = new SessionEngine();
