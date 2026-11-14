/** App tests and the fake Backend's contract tests. Runs without a server, so skips the tests that need local Supabase. */
const base = require('./jest.base.config');

module.exports = {
  ...base,
  testPathIgnorePatterns: ['/node_modules/', '/supabase\\.contract\\.test\\.ts$', '/contentTables\\.contract\\.test\\.ts$'],
};
