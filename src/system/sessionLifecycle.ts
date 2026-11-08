import {AppState, AppStateStatus} from 'react-native';
import {translate} from '../i18n/translations';
import {sessionEngine} from '../session/sessionEngine';
import {useLanguageStore} from '../store/languageStore';
import {useSessionStore} from '../store/sessionStore';
import {useSettingsStore} from '../store/settingsStore';
import {syncService} from '../sync/syncService';
import {
  setKeepAwake,
  startSessionService,
  stopSessionService,
} from './nativeSystem';

export function initSessionLifecycle() {
  let serviceRunning = false;

  const apply = () => {
    const {status} = useSessionStore.getState();
    const active = status !== 'idle';

    if (active && !serviceRunning) {
      serviceRunning = true;
      const language = useLanguageStore.getState().language;
      startSessionService(
        translate(language, 'sessionNotificationTitle'),
        translate(language, 'sessionNotificationBody'),
      );
    } else if (!active && serviceRunning) {
      serviceRunning = false;
      stopSessionService();
    }

    setKeepAwake(
      status === 'running' && useSettingsStore.getState().keepScreenOn,
    );
  };

  const unsubSession = useSessionStore.subscribe((state, prev) => {
    if (state.status !== prev.status) {
      apply();
    }
  });
  const unsubSettings = useSettingsStore.subscribe((state, prev) => {
    if (state.keepScreenOn !== prev.keepScreenOn) {
      apply();
    }
  });

  let appState: AppStateStatus = AppState.currentState;
  const appStateSub = AppState.addEventListener('change', next => {
    if (appState !== 'active' && next === 'active') {
      sessionEngine.publish();
      syncService.syncNow();
    }
    appState = next;
  });

  apply();
  syncService.start();

  return () => {
    unsubSession();
    unsubSettings();
    appStateSub.remove();
    syncService.stop();
    if (serviceRunning) {
      stopSessionService();
    }
    setKeepAwake(false);
  };
}
