import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

export const THRESHOLD_MIN = 3;
export const THRESHOLD_MAX = 15;
export const DEFAULT_THRESHOLD = 8;
export const OUTWARD_THRESHOLD_MIN = 5;
export const OUTWARD_THRESHOLD_MAX = 20;
export const DEFAULT_OUTWARD_THRESHOLD = 10;

const clampRound = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

interface SettingsState {
  inwardThreshold: number;
  outwardThreshold: number;
  demoMode: boolean;
  autoReconnect: boolean;
  vibrationFeedback: boolean;
  invertTilt: boolean;
  swapAxes: boolean;
  keepScreenOn: boolean;

  setInwardThreshold: (value: number) => void;
  setOutwardThreshold: (value: number) => void;
  setDemoMode: (value: boolean) => void;
  setAutoReconnect: (value: boolean) => void;
  setVibrationFeedback: (value: boolean) => void;
  setInvertTilt: (value: boolean) => void;
  setSwapAxes: (value: boolean) => void;
  setKeepScreenOn: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      inwardThreshold: DEFAULT_THRESHOLD,
      outwardThreshold: DEFAULT_OUTWARD_THRESHOLD,
      demoMode: false,
      autoReconnect: true,
      vibrationFeedback: true,
      invertTilt: false,
      swapAxes: false,
      keepScreenOn: false,

      setInwardThreshold: value =>
        set({
          inwardThreshold: clampRound(value, THRESHOLD_MIN, THRESHOLD_MAX),
        }),
      setOutwardThreshold: value =>
        set({
          outwardThreshold: clampRound(
            value,
            OUTWARD_THRESHOLD_MIN,
            OUTWARD_THRESHOLD_MAX,
          ),
        }),
      setDemoMode: demoMode => set({demoMode}),
      setAutoReconnect: autoReconnect => set({autoReconnect}),
      setVibrationFeedback: vibrationFeedback => set({vibrationFeedback}),
      setInvertTilt: invertTilt => set({invertTilt}),
      setSwapAxes: swapAxes => set({swapAxes}),
      setKeepScreenOn: keepScreenOn => set({keepScreenOn}),
    }),
    {
      name: 'ashi-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
