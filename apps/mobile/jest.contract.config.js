/**
 * The Backend contract suite against every implementation. Needs local Supabase running.
 *
 * Runs in plain Node rather than the jest-expo preset: the preset swaps `fetch` for Expo's
 * native one, which has no native module in Jest, so every Supabase response would read
 * as empty. Only the preset's transform is kept, to compile TypeScript.
 */
const { transform } = require('jest-expo/jest-preset');
const base = require('./jest.base.config');

module.exports = {
  testEnvironment: 'node',
  transform,
  transformIgnorePatterns: base.transformIgnorePatterns,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['**/*.contract.test.ts'],
};
