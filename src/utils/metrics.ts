import {Colors} from '../design/colors';

export type TiltZone = 'neutral' | 'inward' | 'outward';

export const getTiltZone = (
  angle: number,
  inwardThreshold: number,
  outwardThreshold = inwardThreshold,
): TiltZone => {
  if (angle > inwardThreshold) {
    return 'inward';
  }
  if (angle < -outwardThreshold) {
    return 'outward';
  }
  return 'neutral';
};

export const zoneColor: Record<TiltZone, string> = {
  neutral: Colors.accent,
  inward: Colors.danger,
  outward: Colors.warning,
};

export const scoreColor = (score: number) => {
  if (score >= 80) {
    return Colors.accent;
  }
  if (score >= 60) {
    return Colors.warning;
  }
  return Colors.danger;
};

export const loadColor = (percent: number) => {
  if (percent <= 15) {
    return Colors.accent;
  }
  if (percent <= 35) {
    return Colors.warning;
  }
  return Colors.danger;
};

export const STALE_DATA_MS = 3000;
