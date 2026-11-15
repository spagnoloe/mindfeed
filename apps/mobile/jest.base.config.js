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
  transformIgnorePatterns: [`node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(${untranspiledPackages.join('|')})/)`],
};
