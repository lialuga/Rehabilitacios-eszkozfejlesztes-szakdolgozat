import {create} from 'zustand';

export type SessionStatus = 'idle' | 'running' | 'paused';

interface SessionState {
  status: SessionStatus;
  startedAt: number | null;
  accumulatedMs: number;
  segmentStartedAt: number | null;
}

export const useSessionStore = create<SessionState>(() => ({
  status: 'idle',
  startedAt: null,
  accumulatedMs: 0,
  segmentStartedAt: null,
}));

export const getElapsedMs = (state: SessionState, now = Date.now()) =>
  state.accumulatedMs +
  (state.segmentStartedAt !== null ? now - state.segmentStartedAt : 0);
