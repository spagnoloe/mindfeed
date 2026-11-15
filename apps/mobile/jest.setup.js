/* global jest */
// See jest.reanimatedMock.js.
jest.mock('react-native-reanimated', () => require('./jest.reanimatedMock'));

// Haptics are a native side effect with nothing to render. A mock lets tests check they fire.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
