import {SessionRecord, useHistoryStore} from '../store/historyStore';
import {SyncError, useSyncStore} from './syncStore';

const REQUEST_TIMEOUT_MS = 8000;
const RETRY_INTERVAL_MS = 2 * 60 * 1000;

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export interface SessionPayload {
  userId: string;
  clientId: string;
  startedAt: string;
  durationMs: number;
  avgStability: number;
  inwardPercent: number;
  balance: number;
  motorActivations: number;
  outwardEvents: number;
  avgCorrectionMs: number;
  peakAngle: number;
  avgAngle: number;
  inwardThreshold: number;
  outwardThreshold: number | null;
  steps: number | null;
  cadence: number | null;
  source: string;
  trace: number[];
}

export const toPayload = (
  record: SessionRecord,
  userId: string,
): SessionPayload => ({
  userId,
  clientId: record.id,
  startedAt: new Date(record.startedAt).toISOString(),
  durationMs: Math.round(record.durationMs),
  avgStability: record.avgStability,
  inwardPercent: record.inwardPercent,
  balance: record.balance,
  motorActivations: record.motorActivations,
  outwardEvents: record.outwardEvents ?? 0,
  avgCorrectionMs: record.avgCorrectionMs,
  peakAngle: record.peakAngle,
  avgAngle: record.avgAngle,
  inwardThreshold: record.threshold,
  outwardThreshold: record.outwardThreshold ?? null,
  steps: record.steps ?? null,
  cadence: record.cadence ?? null,
  source: record.source,
  trace: record.trace,
});

async function request(
  baseUrl: string,
  path: string,
  init: {method: string; body?: unknown},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      headers: {'Content-Type': 'application/json'},
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (
      !response.ok &&
      !(init.method === 'DELETE' && response.status === 404)
    ) {
      throw new HttpError(response.status);
    }
  } finally {
    clearTimeout(timer);
  }
}

class SyncService {
  private running: Promise<boolean> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private historyUnsub: (() => void) | null = null;
  private syncUnsub: (() => void) | null = null;

  start() {
    this.stop();
    this.historyUnsub = useHistoryStore.subscribe((state, prev) => {
      if (state.sessions.length > prev.sessions.length) {
        this.syncNow();
      }
    });
    this.syncUnsub = useSyncStore.subscribe((state, prev) => {
      if (
        (state.enabled && !prev.enabled) ||
        (state.enabled && state.serverUrl !== prev.serverUrl)
      ) {
        this.syncNow();
      }
    });
    this.retryTimer = setInterval(() => {
      if (this.hasPendingWork()) {
        this.syncNow();
      }
    }, RETRY_INTERVAL_MS);
    this.syncNow();
  }

  stop() {
    this.historyUnsub?.();
    this.syncUnsub?.();
    this.historyUnsub = null;
    this.syncUnsub = null;
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  hasPendingWork() {
    const {enabled, pendingDeletes} = useSyncStore.getState();
    return (
      enabled &&
      (pendingDeletes.length > 0 ||
        useHistoryStore.getState().sessions.some(s => !s.syncedAt))
    );
  }

  pendingCount() {
    return useHistoryStore.getState().sessions.filter(s => !s.syncedAt).length;
  }

  syncNow(): Promise<boolean> {
    if (!this.running) {
      this.running = this.run().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async run(): Promise<boolean> {
    const sync = useSyncStore.getState();
    if (!sync.enabled) {
      return true;
    }
    if (!sync.serverUrl) {
      useSyncStore.setState({lastError: 'noServer'});
      return false;
    }

    useSyncStore.setState({syncing: true});
    try {
      for (const clientId of sync.pendingDeletes) {
        await request(
          sync.serverUrl,
          `/session/${encodeURIComponent(sync.userId)}/${encodeURIComponent(
            clientId,
          )}`,
          {method: 'DELETE'},
        );
        useSyncStore.setState(state => ({
          pendingDeletes: state.pendingDeletes.filter(id => id !== clientId),
        }));
      }

      const unsynced = useHistoryStore
        .getState()
        .sessions.filter(s => !s.syncedAt)
        .reverse();
      for (const record of unsynced) {
        await request(sync.serverUrl, '/session', {
          method: 'POST',
          body: toPayload(record, sync.userId),
        });
        useHistoryStore.getState().markSynced([record.id], Date.now());
      }

      useSyncStore.setState({lastSyncAt: Date.now(), lastError: null});
      return true;
    } catch (error) {
      const lastError: SyncError =
        error instanceof HttpError ? 'server' : 'unreachable';
      console.warn('[sync] failed', error);
      useSyncStore.setState({lastError});
      return false;
    } finally {
      useSyncStore.setState({syncing: false});
    }
  }
}

export const syncService = new SyncService();
