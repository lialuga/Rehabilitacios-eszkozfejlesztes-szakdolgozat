import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  State,
  Subscription,
} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import {
  CONTROL_CHARACTERISTIC_UUID,
  ControlCommand,
  SENSOR_CHARACTERISTIC_UUID,
  SENSOR_SERVICE_UUID,
  decodeBase64,
  encodeBase64,
  matchesSensorDevice,
  parsePacket,
} from './protocol';
import {sessionEngine} from '../session/sessionEngine';
import {
  ConnectionIssue,
  setConnection,
  useConnectionStore,
} from '../store/connectionStore';
import {useSessionStore} from '../store/sessionStore';
import {useSettingsStore} from '../store/settingsStore';

const SCAN_TIMEOUT_MS = 12000;
const CONNECT_TIMEOUT_MS = 10000;
const POWER_STATE_TIMEOUT_MS = 4000;
const RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const MONITOR_TRANSACTION = 'ashi-sensor-monitor';
const CONTROL_SYNC_ATTEMPTS = 8;
const CONTROL_SYNC_RETRY_MS = 2000;

type PermissionResult = 'granted' | 'denied' | 'blocked';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class BLEService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private monitorSub: Subscription | null = null;
  private disconnectSub: Subscription | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private settingsUnsub: (() => void) | null = null;
  private generation = 0;

  private getManager() {
    if (!this.manager) {
      this.manager = new BleManager();
    }
    return this.manager;
  }

  private fail(issue: ConnectionIssue) {
    setConnection({status: 'idle', issue});
  }

  private async requestPermissions(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return 'granted';
    }

    const apiLevel =
      typeof Platform.Version === 'number' ? Platform.Version : 0;
    const permissions =
      apiLevel >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const result = await PermissionsAndroid.requestMultiple(permissions);
    const values = permissions.map(p => result[p]);

    if (values.every(v => v === PermissionsAndroid.RESULTS.GRANTED)) {
      return 'granted';
    }
    return values.some(v => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
      ? 'blocked'
      : 'denied';
  }

  private waitForAdapter(): Promise<State> {
    const manager = this.getManager();
    return new Promise(resolve => {
      let settled = false;
      let sub: Subscription | null = null;
      const finish = (state: State) => {
        if (settled) {
          return;
        }
        settled = true;
        sub?.remove();
        clearTimeout(timer);
        resolve(state);
      };
      const timer = setTimeout(
        () => finish(State.Unknown),
        POWER_STATE_TIMEOUT_MS,
      );
      sub = manager.onStateChange(state => {
        if (state !== State.Unknown && state !== State.Resetting) {
          finish(state);
        }
      }, true);
      if (settled) {
        sub.remove();
      }
    });
  }

  async connect() {
    try {
      await this.connectFlow();
    } catch (error) {
      console.warn('[BLE] connect failed', error);
      this.stopScan();
      this.fail('connectFailed');
    }
  }

  private async connectFlow() {
    const {status} = useConnectionStore.getState();
    if (
      status === 'scanning' ||
      status === 'connecting' ||
      status === 'connected'
    ) {
      return;
    }

    const generation = ++this.generation;
    setConnection({status: 'scanning', issue: null});

    const permission = await this.requestPermissions();
    if (generation !== this.generation) {
      return;
    }
    if (permission !== 'granted') {
      this.fail(
        permission === 'blocked' ? 'permissionBlocked' : 'permissionDenied',
      );
      return;
    }

    const state = await this.waitForAdapter();
    if (generation !== this.generation) {
      return;
    }
    if (state === State.PoweredOff) {
      this.fail('bluetoothOff');
      return;
    }
    if (state === State.Unauthorized) {
      this.fail('permissionBlocked');
      return;
    }
    if (state === State.Unsupported) {
      this.fail('bluetoothUnsupported');
      return;
    }

    this.scan(generation);
  }

  private scan(generation: number) {
    const manager = this.getManager();

    this.scanTimer = setTimeout(() => {
      this.stopScan();
      if (generation === this.generation) {
        this.fail('notFound');
      }
    }, SCAN_TIMEOUT_MS);

    manager.startDeviceScan(null, {allowDuplicates: false}, (error, found) => {
      if (generation !== this.generation) {
        this.stopScan();
        return;
      }
      if (error) {
        this.stopScan();
        this.fail(this.issueFromError(error));
        return;
      }
      if (found && matchesSensorDevice(found)) {
        this.stopScan();
        this.connectTo(found.id, generation, found.localName ?? found.name);
      }
    });
  }

  private stopScan() {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    this.manager?.stopDeviceScan();
  }

  private async connectTo(
    deviceId: string,
    generation: number,
    name: string | null,
    reconnecting = false,
  ): Promise<boolean> {
    const manager = this.getManager();
    setConnection({
      status: reconnecting ? 'reconnecting' : 'connecting',
      deviceId,
      deviceName: name ?? useConnectionStore.getState().deviceName,
    });

    try {
      let device = await manager.connectToDevice(deviceId, {
        timeout: CONNECT_TIMEOUT_MS,
      });
      device = await device.discoverAllServicesAndCharacteristics();

      if (Platform.OS === 'android') {
        device = await device.requestMTU(64).catch(() => device);
      }

      const characteristics = await device
        .characteristicsForService(SENSOR_SERVICE_UUID)
        .catch(() => []);
      const uuids = characteristics.map(c => c.uuid.toLowerCase());

      if (generation !== this.generation) {
        await manager.cancelDeviceConnection(deviceId).catch(() => undefined);
        return false;
      }
      if (!uuids.includes(SENSOR_CHARACTERISTIC_UUID)) {
        await manager.cancelDeviceConnection(deviceId).catch(() => undefined);
        if (!reconnecting) {
          this.fail('incompatibleDevice');
        }
        return false;
      }

      this.attach(
        device,
        generation,
        uuids.includes(CONTROL_CHARACTERISTIC_UUID),
      );
      return true;
    } catch (error) {
      if (generation === this.generation && !reconnecting) {
        this.fail('connectFailed');
      }
      return false;
    }
  }

  private attach(
    device: Device,
    generation: number,
    controlSupported: boolean,
  ) {
    this.device = device;
    setConnection({
      status: 'connected',
      issue: null,
      deviceId: device.id,
      deviceName: device.localName ?? device.name ?? 'Ashi sensor',
      controlSupported,
      controlPairingFailed: false,
    });

    if (controlSupported) {
      this.syncSettings(generation);
    }

    this.disconnectSub?.remove();
    this.disconnectSub = device.onDisconnected(() => {
      if (generation === this.generation) {
        this.handleUnexpectedDisconnect(device.id, generation);
      }
    });

    this.monitorSub?.remove();
    this.monitorSub = device.monitorCharacteristicForService(
      SENSOR_SERVICE_UUID,
      SENSOR_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          if (error.errorCode !== BleErrorCode.OperationCancelled) {
            console.warn('[BLE] monitor error', error.message);
          }
          return;
        }
        if (!characteristic?.value) {
          return;
        }
        const packet = parsePacket(decodeBase64(characteristic.value));
        if (packet) {
          sessionEngine.ingest(packet, 'ble');
        }
      },
      MONITOR_TRANSACTION,
    );
  }

  private async handleUnexpectedDisconnect(
    deviceId: string,
    generation: number,
  ) {
    this.cleanupDevice();
    setConnection({controlSupported: false});

    if (useSessionStore.getState().status === 'running') {
      sessionEngine.pause();
    }

    if (useSettingsStore.getState().autoReconnect) {
      for (let attempt = 0; attempt < RECONNECT_ATTEMPTS; attempt++) {
        setConnection({status: 'reconnecting', issue: null});
        await sleep(RECONNECT_DELAY_MS);
        if (generation !== this.generation) {
          return;
        }
        if (await this.connectTo(deviceId, generation, null, true)) {
          return;
        }
      }
    }

    if (generation === this.generation) {
      this.fail('connectionLost');
    }
  }

  private async syncSettings(generation = this.generation) {
    this.subscribeSettings();
    setConnection({controlPairingFailed: false});

    let paired = false;
    for (let attempt = 0; attempt < CONTROL_SYNC_ATTEMPTS; attempt++) {
      if (generation !== this.generation || !this.device) {
        return;
      }
      const {inwardThreshold} = useSettingsStore.getState();
      if (await this.write(ControlCommand.setThreshold(inwardThreshold))) {
        paired = true;
        break;
      }
      await sleep(CONTROL_SYNC_RETRY_MS);
    }
    if (generation !== this.generation) {
      return;
    }
    if (!paired) {
      setConnection({controlPairingFailed: true});
      return;
    }

    const settings = useSettingsStore.getState();
    await this.write(
      ControlCommand.setOutwardThreshold(settings.outwardThreshold),
    );
    await this.write(ControlCommand.setVibration(settings.vibrationFeedback));
    await this.write(ControlCommand.setMount(settings));
  }

  retryControlSync() {
    return this.syncSettings();
  }

  private subscribeSettings() {
    this.settingsUnsub?.();
    this.settingsUnsub = useSettingsStore.subscribe((state, prev) => {
      if (state.inwardThreshold !== prev.inwardThreshold) {
        this.write(ControlCommand.setThreshold(state.inwardThreshold));
      }
      if (state.outwardThreshold !== prev.outwardThreshold) {
        this.write(ControlCommand.setOutwardThreshold(state.outwardThreshold));
      }
      if (state.vibrationFeedback !== prev.vibrationFeedback) {
        this.write(ControlCommand.setVibration(state.vibrationFeedback));
      }
      if (
        state.invertTilt !== prev.invertTilt ||
        state.swapAxes !== prev.swapAxes
      ) {
        this.write(ControlCommand.setMount(state));
      }
    });
  }

  private async write(command: Uint8Array): Promise<boolean> {
    const device = this.device;
    if (!device || !useConnectionStore.getState().controlSupported) {
      return false;
    }
    try {
      await device.writeCharacteristicWithResponseForService(
        SENSOR_SERVICE_UUID,
        CONTROL_CHARACTERISTIC_UUID,
        encodeBase64(command),
      );
      return true;
    } catch (error) {
      console.warn('[BLE] control write failed', error);
      return false;
    }
  }

  calibrate() {
    return this.write(ControlCommand.calibrate());
  }

  testVibration() {
    return this.write(ControlCommand.testVibration());
  }

  private cleanupDevice() {
    this.settingsUnsub?.();
    this.settingsUnsub = null;
    this.monitorSub?.remove();
    this.monitorSub = null;
    this.disconnectSub?.remove();
    this.disconnectSub = null;
    this.device = null;
    setConnection({controlPairingFailed: false});
  }

  async disconnect() {
    this.generation++;
    this.stopScan();

    const deviceId = this.device?.id ?? useConnectionStore.getState().deviceId;
    this.cleanupDevice();
    setConnection({status: 'idle', issue: null, controlSupported: false});

    if (deviceId && this.manager) {
      await this.manager
        .cancelDeviceConnection(deviceId)
        .catch(() => undefined);
    }
  }

  dismissIssue() {
    setConnection({issue: null});
  }

  private issueFromError(error: BleError): ConnectionIssue {
    switch (error.errorCode) {
      case BleErrorCode.BluetoothPoweredOff:
        return 'bluetoothOff';
      case BleErrorCode.BluetoothUnauthorized:
        return 'permissionBlocked';
      case BleErrorCode.BluetoothUnsupported:
        return 'bluetoothUnsupported';
      default:
        return 'connectFailed';
    }
  }
}

export const bleService = new BLEService();
