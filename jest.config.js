module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/stepalign-backend/'],
  modulePathIgnorePatterns: ['<rootDir>/stepalign-backend/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|react-native-linear-gradient|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-ble-plx)/)',
  ],
};
