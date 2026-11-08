import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {useSyncStore} from '../sync/syncStore';
import {DataSource} from './liveStore';

export interface SessionRecord {
  id: string;
  startedAt: number;
  durationMs: number;
  avgStability: number;
  inwardPercent: number;
  balance: number;
  motorActivations: number;
  avgCorrectionMs: number;
  peakAngle: number;
  avgAngle: number;
  threshold: number;
  outwardEvents?: number;
  outwardThreshold?: number;
  steps?: number | null;
  cadence?: number | null;
  source: DataSource;
  trace: number[];
  syncedAt?: number;
}

const MAX_SESSIONS = 100;

interface HistoryState {
  sessions: SessionRecord[];
  addSession: (record: SessionRecord) => void;
  removeSession: (id: string) => void;
  clear: () => void;
  markSynced: (ids: string[], at: number) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    set => ({
      sessions: [],
      addSession: record =>
        set(state => ({
          sessions: [record, ...state.sessions].slice(0, MAX_SESSIONS),
        })),
      removeSession: id =>
        set(state => {
          const removed = state.sessions.find(s => s.id === id);
          if (removed?.syncedAt) {
            useSyncStore.getState().queueDeletes([id]);
          }
          return {sessions: state.sessions.filter(s => s.id !== id)};
        }),
      clear: () =>
        set(state => {
          const synced = state.sessions.filter(s => s.syncedAt).map(s => s.id);
          if (synced.length) {
            useSyncStore.getState().queueDeletes(synced);
          }
          return {sessions: []};
        }),
      markSynced: (ids, at) =>
        set(state => ({
          sessions: state.sessions.map(s =>
            ids.includes(s.id) ? {...s, syncedAt: at} : s,
          ),
        })),
    }),
    {
      name: 'ashi-history',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
