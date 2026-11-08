import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

export type SyncError = 'noServer' | 'unreachable' | 'server';

export const createUserId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });

export const normalizeServerUrl = (input: string) => {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
};

interface SyncState {
  enabled: boolean;
  serverUrl: string;
  userId: string;
  pendingDeletes: string[];
  lastSyncAt: number | null;
  lastError: SyncError | null;
  syncing: boolean;

  setEnabled: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
  queueDeletes: (ids: string[]) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    set => ({
      enabled: false,
      serverUrl: '',
      userId: createUserId(),
      pendingDeletes: [],
      lastSyncAt: null,
      lastError: null,
      syncing: false,

      setEnabled: enabled => set({enabled, lastError: null}),
      setServerUrl: url =>
        set({serverUrl: normalizeServerUrl(url), lastError: null}),
      queueDeletes: ids =>
        set(state => ({
          pendingDeletes: Array.from(
            new Set([...state.pendingDeletes, ...ids]),
          ),
        })),
    }),
    {
      name: 'ashi-sync',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({syncing: _syncing, ...rest}) => rest,
    },
  ),
);
