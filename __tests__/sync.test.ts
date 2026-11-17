import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {NativeModules} from 'react-native';
import {SessionRecord, useHistoryStore} from '../src/store/historyStore';
import {useSessionStore} from '../src/store/sessionStore';
import {useSettingsStore} from '../src/store/settingsStore';
import {syncService, toPayload} from '../src/sync/syncService';
import {
  createUserId,
  normalizeServerUrl,
  useSyncStore,
} from '../src/sync/syncStore';

const record = (id: string, extra: Partial<SessionRecord> = {}) =>
  ({
    id,
    startedAt: Date.UTC(2026, 10, 4, 10, 0, 0),
    durationMs: 60_000,
    avgStability: 80,
    inwardPercent: 10,
    balance: 85,
    motorActivations: 3,
    outwardEvents: 1,
    avgCorrectionMs: 400,
    peakAngle: 12,
    avgAngle: 2,
    threshold: 8,
    outwardThreshold: 10,
    steps: 100,
    cadence: 100,
    source: 'ble',
    trace: [1, 2, 3],
    ...extra,
  } as SessionRecord);

type FetchMock = jest.Mock<
  (url: string, init?: {method?: string; body?: string}) => Promise<unknown>
>;
let fetchMock: FetchMock;

const ok = () => Promise.resolve({ok: true, status: 200});

beforeEach(() => {
  fetchMock = jest.fn(ok) as FetchMock;
  (global as unknown as {fetch: unknown}).fetch = fetchMock;
  useHistoryStore.setState({sessions: []});
  useSyncStore.setState({
    enabled: true,
    serverUrl: 'http://server:3000',
    userId: 'user-1',
    pendingDeletes: [],
    lastSyncAt: null,
    lastError: null,
    syncing: false,
  });
});

afterEach(() => syncService.stop());

describe('sync helpers', () => {
  it('normalises server addresses', () => {
    expect(normalizeServerUrl(' 192.168.1.5:3000/ ')).toBe(
      'http://192.168.1.5:3000',
    );
    expect(normalizeServerUrl('https://api.ashi.app')).toBe(
      'https://api.ashi.app',
    );
    expect(normalizeServerUrl('')).toBe('');
  });

  it('creates v4-style user ids', () => {
    expect(createUserId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('maps records to the backend payload, tolerating old records', () => {
    const old = record('old', {
      outwardEvents: undefined,
      outwardThreshold: undefined,
      steps: undefined,
      cadence: undefined,
    });
    expect(toPayload(old, 'u')).toMatchObject({
      userId: 'u',
      clientId: 'old',
      startedAt: '2026-11-04T10:00:00.000Z',
      inwardThreshold: 8,
      outwardEvents: 0,
      outwardThreshold: null,
      steps: null,
      cadence: null,
    });
  });
});

describe('syncService', () => {
  it('uploads unsynced sessions oldest first and marks them', async () => {
    useHistoryStore.setState({
      sessions: [record('new'), record('old'), record('done', {syncedAt: 1})],
    });
    await expect(syncService.syncNow()).resolves.toBe(true);

    const bodies = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init?.body ?? '{}').clientId,
    );
    expect(bodies).toEqual(['old', 'new']);
    expect(fetchMock.mock.calls[0][0]).toBe('http://server:3000/session');
    expect(useHistoryStore.getState().sessions.every(s => s.syncedAt)).toBe(
      true,
    );
    expect(useSyncStore.getState().lastError).toBeNull();
  });

  it('keeps records unsynced and reports when the server is down', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    useHistoryStore.setState({sessions: [record('a')]});
    await expect(syncService.syncNow()).resolves.toBe(false);
    expect(useHistoryStore.getState().sessions[0].syncedAt).toBeUndefined();
    expect(useSyncStore.getState().lastError).toBe('unreachable');
  });

  it('reports server errors separately', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ok: false, status: 400}),
    );
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    useHistoryStore.setState({sessions: [record('a')]});
    await syncService.syncNow();
    expect(useSyncStore.getState().lastError).toBe('server');
  });

  it('replays deletions of synced sessions only', async () => {
    useHistoryStore.setState({
      sessions: [record('synced', {syncedAt: 5}), record('local')],
    });
    useHistoryStore.getState().removeSession('synced');
    useHistoryStore.getState().removeSession('local');
    expect(useSyncStore.getState().pendingDeletes).toEqual(['synced']);

    await syncService.syncNow();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://server:3000/session/user-1/synced',
      expect.objectContaining({method: 'DELETE'}),
    );
    expect(useSyncStore.getState().pendingDeletes).toEqual([]);
  });

  it('does nothing while disabled and asks for a server address', async () => {
    useHistoryStore.setState({sessions: [record('a')]});
    useSyncStore.setState({enabled: false});
    await syncService.syncNow();
    expect(fetchMock).not.toHaveBeenCalled();

    useSyncStore.setState({enabled: true, serverUrl: ''});
    await expect(syncService.syncNow()).resolves.toBe(false);
    expect(useSyncStore.getState().lastError).toBe('noServer');
  });
});

describe('session lifecycle', () => {
  it('runs the native session service only while a session is active', () => {
    const native = {
      setKeepAwake: jest.fn(),
      startSessionService: jest.fn(),
      stopSessionService: jest.fn(),
    };
    NativeModules.AshiSystem = native;
    jest.isolateModules(() => {
      const {initSessionLifecycle} = require('../src/system/sessionLifecycle');
      const {
        useSessionStore: sessionStore,
      } = require('../src/store/sessionStore');
      const {
        useSettingsStore: settingsStore,
      } = require('../src/store/settingsStore');
      settingsStore.setState({keepScreenOn: true});
      const cleanup = initSessionLifecycle();

      sessionStore.setState({status: 'running'});
      expect(native.startSessionService).toHaveBeenCalledTimes(1);
      expect(native.setKeepAwake).toHaveBeenLastCalledWith(true);

      sessionStore.setState({status: 'paused'});
      expect(native.setKeepAwake).toHaveBeenLastCalledWith(false);
      expect(native.stopSessionService).not.toHaveBeenCalled();

      sessionStore.setState({status: 'idle'});
      expect(native.stopSessionService).toHaveBeenCalledTimes(1);
      cleanup();
    });
    delete NativeModules.AshiSystem;
    useSessionStore.setState({status: 'idle'});
    useSettingsStore.setState({keepScreenOn: false});
  });
});
