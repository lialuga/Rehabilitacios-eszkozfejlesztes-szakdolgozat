import {useConnectionStore} from '../store/connectionStore';
import {useLiveStore} from '../store/liveStore';
import {useSettingsStore} from '../store/settingsStore';
import {STALE_DATA_MS} from '../utils/metrics';
import {useNow} from './useNow';

export type DataStatus = 'live' | 'demo' | 'stale' | 'offline';

export const useDataStatus = (): DataStatus => {
  const connection = useConnectionStore(state => state.status);
  const demoMode = useSettingsStore(state => state.demoMode);
  const source = useLiveStore(state => state.source);
  const lastPacketSecond = useLiveStore(state =>
    Math.floor(state.lastPacketAt / 1000),
  );
  const now = useNow(1000, connection === 'connected');

  if (connection === 'connected') {
    return source === 'ble' &&
      now - lastPacketSecond * 1000 < STALE_DATA_MS + 1000
      ? 'live'
      : 'stale';
  }
  return demoMode ? 'demo' : 'offline';
};
