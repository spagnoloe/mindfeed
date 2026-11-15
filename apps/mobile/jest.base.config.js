// Packages shipped untranspiled, which Jest must run through Babel. Matches pnpm's
// node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg> layout too.
const untranspiledPackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?/.*',
  'expo-.*',
  '@expo-google-fonts/.*',
  'react-navigation',
  '@react-navigation/.*',
  'standard-navigation',
  'react-native-.*',
];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // expo-router's testing library re-mocks Reanimated with `react-native-reanimated/mock`, which
  // can't load under Jest. Point that at the app's own mock too (see jest.reanimatedMock.js).
  moduleNameMapper: { '^react-native-reanimated/mock$': '<rootDir>/jest.reanimatedMock.js' },
  transformIgnorePatterns: [`node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(${untranspiledPackages.join('|')})/)`],
};
