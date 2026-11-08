import {create} from 'zustand';

export type ConnectionStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'reconnecting'
  | 'connected';

export type ConnectionIssue =
  | 'bluetoothOff'
  | 'bluetoothUnsupported'
  | 'permissionDenied'
  | 'permissionBlocked'
  | 'notFound'
  | 'connectFailed'
  | 'incompatibleDevice'
  | 'connectionLost';

interface ConnectionState {
  status: ConnectionStatus;
  issue: ConnectionIssue | null;
  deviceName: string | null;
  deviceId: string | null;
  controlSupported: boolean;
  controlPairingFailed: boolean;
}

export const useConnectionStore = create<ConnectionState>(() => ({
  status: 'idle',
  issue: null,
  deviceName: null,
  deviceId: null,
  controlSupported: false,
  controlPairingFailed: false,
}));

export const setConnection = (patch: Partial<ConnectionState>) =>
  useConnectionStore.setState(patch);
