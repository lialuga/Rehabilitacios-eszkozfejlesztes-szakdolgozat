import {sessionEngine} from '../session/sessionEngine';

const INTERVAL_MS = 50;

let intervalRef: ReturnType<typeof setInterval> | null = null;
let t = 0;
let battery = 87;
let excursion = {start: 6, duration: 1, peak: 8, outward: false};
let strikes = 0;
let nextStrikeAt = 1;

const gaussian = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const nextRoll = () => {
  const base = 2.2 * Math.sin(t * 1.9) + 1.1 * Math.sin(t * 0.43 + 1.3);
  const noise = gaussian() * 0.35;

  if (t > excursion.start + excursion.duration) {
    excursion = {
      start: t + 4 + Math.random() * 9,
      duration: 0.8 + Math.random() * 1.2,
      peak: 6 + Math.random() * 7,
      outward: Math.random() < 0.2,
    };
  }

  const phase = (t - excursion.start) / excursion.duration;
  const bump =
    phase >= 0 && phase <= 1 ? excursion.peak * Math.sin(Math.PI * phase) : 0;

  return base + noise + (excursion.outward ? -bump * 1.1 : bump);
};

export function startMockStream() {
  if (intervalRef) {
    return;
  }

  intervalRef = setInterval(() => {
    t += INTERVAL_MS / 1000;
    battery = Math.max(5, battery - 0.0004);
    const roll = nextRoll();
    if (t >= nextStrikeAt) {
      strikes = (strikes + 1) % 0x10000;
      nextStrikeAt = t + 1.0 + Math.random() * 0.25;
    }

    sessionEngine.ingest(
      {
        roll: Math.round(roll * 100) / 100,
        pitch: 0,
        stability: 0,
        inwardPercent: 0,
        battery: Math.round(battery),
        strikes,
      },
      'demo',
    );
  }, INTERVAL_MS);
}

export function stopMockStream() {
  if (!intervalRef) {
    return;
  }
  clearInterval(intervalRef);
  intervalRef = null;
}

export const isMockStreamRunning = () => intervalRef !== null;
