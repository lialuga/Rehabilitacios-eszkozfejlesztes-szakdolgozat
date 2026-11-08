import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

interface AshiSystemModule {
  setKeepAwake(enabled: boolean): void;
  startSessionService(title: string, body: string): void;
  stopSessionService(): void;
}

const native: AshiSystemModule | undefined = NativeModules.AshiSystem;

export const setKeepAwake = (enabled: boolean) => native?.setKeepAwake(enabled);

export async function startSessionService(title: string, body: string) {
  if (!native) {
    return;
  }
  if (
    Platform.OS === 'android' &&
    typeof Platform.Version === 'number' &&
    Platform.Version >= 33
  ) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ).catch(() => undefined);
  }
  native.startSessionService(title, body);
}

export const stopSessionService = () => native?.stopSessionService();
