/* global jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-linear-gradient', () => {
  const {View} = require('react-native');
  return View;
});

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn(),
  BleErrorCode: {},
  State: {},
}));

jest.mock('./src/components/GlassView', () => ({
  GlassView: () => null,
}));
