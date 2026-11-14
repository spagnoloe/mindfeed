/** App tests and the fake Backend's contract tests. Runs without a server. */
const base = require('./jest.base.config');

module.exports = {
  ...base,
  testPathIgnorePatterns: ['/node_modules/', '/supabase\\.contract\\.test\\.ts$'],
};
