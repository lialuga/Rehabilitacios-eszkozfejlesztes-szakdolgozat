import {create} from 'zustand';

export type DataSource = 'ble' | 'demo';

export interface LiveMetrics {
  angle: number;
  stability: number;
  battery: number | null;
  source: DataSource | null;
  lastPacketAt: number;

  inwardPercent: number;
  balance: number;
  motorActivations: number;
  outwardEvents: number;
  avgCorrectionMs: number;
  peakAngle: number;

  stepsSupported: boolean;
  steps: number | null;
  cadence: number | null;

  rollSeries: number[];
  stabilitySeries: number[];
  inwardSeries: number[];
}

export const initialLiveMetrics: LiveMetrics = {
  angle: 0,
  stability: 0,
  battery: null,
  source: null,
  lastPacketAt: 0,
  inwardPercent: 0,
  balance: 0,
  motorActivations: 0,
  outwardEvents: 0,
  avgCorrectionMs: 0,
  peakAngle: 0,
  stepsSupported: false,
  steps: null,
  cadence: null,
  rollSeries: [],
  stabilitySeries: [],
  inwardSeries: [],
};

export const useLiveStore = create<LiveMetrics>(() => initialLiveMetrics);
